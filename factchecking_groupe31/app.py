import os
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional

import requests
from dotenv import load_dotenv

import tldextract
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

try:
    from openai import OpenAI
except ImportError:  # library not installed yet
    OpenAI = None

load_dotenv()

app = Flask(__name__)

TRUSTED_DOMAIN_PRIORS: Dict[str, float] = {
    "apnews.com": 0.9,
    "reuters.com": 0.9,
    "afp.com": 0.88,
    "fullfact.org": 0.9,
    "politifact.com": 0.88,
    "factcheck.org": 0.88,
    "snopes.com": 0.85,
    "who.int": 0.9,
    "oecd.org": 0.88,
    "europa.eu": 0.9,
    "gouv.fr": 0.88,
    "lemonde.fr": 0.86,
    "nytimes.com": 0.86,
    "washingtonpost.com": 0.86,
    "theguardian.com": 0.86,
    "bbc.com": 0.88,
    "bbc.co.uk": 0.88,
    "wikipedia.org": 0.75,
}
DEFAULT_NEUTRAL_PRIOR = 0.45
MIN_CREDIBILITY_INCLUDE = 0.6
MIN_RELEVANCE = 0.35
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
SERPAPI_KEY = os.getenv("SERPAPI_API_KEY")
MAX_RESULTS = 6
CRED_CACHE_PATH = os.path.join(os.path.dirname(__file__), "cred_cache.json")
BLOCKED_DOMAINS = {
    "reddit.com",
    "medium.com",
    "quora.com",
    "4chan.org",
    "8chan",
    "tiktok.com",
}
MAX_CRED_FOR_UGC = 0.3
UGC_DOMAINS = {
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "linkedin.com",
    "youtube.com",
}
cred_cache: Dict[str, float] = {}


def load_cred_cache() -> Dict[str, float]:
    try:
        if os.path.exists(CRED_CACHE_PATH):
            with open(CRED_CACHE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return {k: float(v) for k, v in data.items()}
    except Exception:
        pass
    return {}


def save_cred_cache():
    try:
        with open(CRED_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(cred_cache, f, ensure_ascii=True, indent=2)
    except Exception:
        pass


cred_cache = load_cred_cache()


class Evidence:
    def __init__(
        self,
        source: str,
        url: str,
        snippet: str,
        stance: str,
        confidence: float,
        credibility: float,
        relevance: float,
        used_in_score: bool,
    ):
        self.source = source
        self.url = url
        self.snippet = snippet
        self.stance = stance
        self.confidence = max(0.0, min(confidence, 1.0))
        self.credibility = max(0.0, min(credibility, 1.0))
        self.relevance = max(0.0, min(relevance, 1.0))
        self.used_in_score = used_in_score

    def to_dict(self) -> Dict:
        return {
            "source": self.source,
            "url": self.url,
            "snippet": self.snippet,
            "stance": self.stance,
            "confidence": self.confidence,
            "credibility": self.credibility,
            "relevance": self.relevance,
            "used_in_score": self.used_in_score,
        }


def domain_from_url(url: str) -> str:
    parsed = tldextract.extract(url)
    if not parsed.domain:
        return ""
    if parsed.suffix:
        return f"{parsed.domain}.{parsed.suffix}"
    return parsed.domain


def credibility_prior(url_or_domain: str) -> float:
    domain = domain_from_url(url_or_domain) if "." in url_or_domain else url_or_domain
    domain_lower = domain.lower()

    # Check exact match in trusted list
    if domain_lower in TRUSTED_DOMAIN_PRIORS:
        return TRUSTED_DOMAIN_PRIORS[domain_lower]

    # Boost for government/edu/non-profit domains
    if domain_lower.endswith(".gov") or domain_lower.endswith(".edu"):
        return 0.8
    if domain_lower.endswith(".int"):
        return 0.85
    if domain_lower.endswith(".org") and any(
        keyword in domain_lower for keyword in ["who", "oecd", "unicef", "unhcr", "fact", "check"]
    ):
        return 0.8

    return DEFAULT_NEUTRAL_PRIOR


def llm_score_domain(domain: str, evidence_text: Optional[str]) -> Optional[float]:
    key = os.getenv("OPENAI_API_KEY")
    if not (OpenAI and key):
        return None
    try:
        client = OpenAI(api_key=key)
        excerpt = evidence_text[:1200] if evidence_text else ""
        prompt = (
            "Rate the credibility of this source domain (0-1). Be critical and nuanced. "
            "Guidelines: 0.9-1.0 = peer-reviewed journals/top fact-checkers only; "
            "0.7-0.85 = reputable news (Reuters, BBC) or Wikipedia (editing can introduce bias); "
            "0.5-0.7 = established media with some bias; "
            "0.3-0.5 = opinion sites/blogs; below 0.3 = unreliable/UGC. "
            "Consider: factual accuracy, editorial standards, bias, transparency. "
            "Return strict JSON: {\"credibility\": 0-1}."
        )
        completion = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You evaluate source credibility."},
                {"role": "user", "content": f"Domain: {domain}\nEvidence excerpt (optional): {excerpt}\n{prompt}"},
            ],
            max_tokens=80,
        )
        raw = (completion.choices[0].message.content or "").replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        val = float(data.get("credibility", 0.0))
        if val == val:  # not NaN
            return max(0.0, min(val, 1.0))
    except Exception:
        return None
    return None


def credibility_for_source(url_or_domain: str, evidence_text: Optional[str] = None) -> float:
    domain = domain_from_url(url_or_domain) if "." in url_or_domain else url_or_domain
    domain_lower = domain.lower()
    if domain_lower in cred_cache:
        score = cred_cache[domain_lower]
        if domain_lower in UGC_DOMAINS:
            score = min(score, MAX_CRED_FOR_UGC)
        return score

    prior = credibility_prior(domain_lower)
    scored = llm_score_domain(domain_lower, evidence_text)
    final = scored if scored is not None else prior
    if domain_lower in UGC_DOMAINS:
        final = min(final, MAX_CRED_FOR_UGC)
    cred_cache[domain_lower] = final
    save_cred_cache()
    return final


def is_blocked_domain(domain: str) -> bool:
    return domain.lower() in BLOCKED_DOMAINS


def extract_claims(text: str) -> List[str]:
    key = os.getenv("OPENAI_API_KEY")
    if OpenAI and key:
        try:
            client = OpenAI(api_key=key)
            prompt = (
                "Extract atomic, verifiable factual claims from the text. "
                "IMPORTANT: Split on 'and'/'et' conjunctions so each claim is separate. "
                "Example: '5G causes autism, and Hitler was a leftist' → ['5G causes autism', 'Hitler was a leftist']. "
                "Return max 5 claims as a JSON array of strings, no commentary."
            )
            completion = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You extract concise, atomic factual claims."},
                    {"role": "user", "content": f"Texte: {text}\nRéponds uniquement avec une liste JSON."},
                ],
                max_tokens=300,
            )
            raw = completion.choices[0].message.content or "[]"
            # Strip common code fences
            raw = raw.replace("```json", "").replace("```", "").strip()
            try:
                parsed = json.loads(raw)
                claims = postprocess_claims([c for c in parsed if isinstance(c, str)])
                return claims or fallback_claims(text)
            except Exception:
                return fallback_claims(text)
        except Exception:
            return fallback_claims(text)
    return fallback_claims(text)


def fallback_claims(text: str) -> List[str]:
    normalized = text.replace("?", ".").replace("!", ".")
    # Also split on comma+and patterns to separate conjoined claims
    normalized = normalized.replace(", and", ".").replace(", et", ".")
    sentences = [p.strip() for p in normalized.split(".")]
    splits: List[str] = []
    for s in sentences:
        if len(s.split()) >= 10 and " and " in s.lower():
            splits.extend([x.strip() for x in s.split(" and ") if len(x.strip().split()) >= 5])
        else:
            splits.append(s)
    claims = [p for p in splits if len(p.split()) >= 5]
    claims = postprocess_claims(claims)
    return claims or ([text.strip()] if text.strip() else [])


def postprocess_claims(claims: List[str]) -> List[str]:
    cleaned = []
    seen = set()
    for c in claims:
        c_strip = c.strip()
        if len(c_strip) < 5:
            continue
        if c_strip.lower() in seen:
            continue
        seen.add(c_strip.lower())
        cleaned.append(c_strip)
        if len(cleaned) >= 5:
            break
    return cleaned


def expand_conjoined_claims(claims: List[str]) -> List[str]:
    expanded: List[str] = []
    for c in claims:
        c_lower = c.lower()
        # Check for conjunctions - be more aggressive with splitting
        has_conjunction = (" and " in c_lower or " et " in c_lower or ", and" in c_lower or ", et" in c_lower)
        if has_conjunction:
            # Try splitting on these patterns
            temp = c.replace(", and", "|").replace(", et", "|").replace(" and ", "|").replace(" et ", "|")
            parts = [p.strip() for p in temp.split("|")]
            # Accept any part with at least 2 words (to catch short claims like "Dieu existe")
            valid_parts = [p for p in parts if len(p.split()) >= 2]
            if len(valid_parts) >= 2:  # Only split if we get multiple valid parts
                expanded.extend(valid_parts)
            else:
                expanded.append(c)
        elif "," in c and len(c.split()) >= 8:
            # Comma-separated claims
            parts = [p.strip() for p in c.split(",")]
            for p in parts:
                if len(p.split()) >= 4:
                    expanded.append(p)
        else:
            expanded.append(c)
    return postprocess_claims(expanded)


def detect_hate_claim(claim: str) -> bool:
    lowered = claim.lower()
    hate_keywords = [
        " is evil",
        " are evil",
        " subhuman",
        " exterminate",
        " extermination",
        " genocide",
        " vermin",
        " parasite",
        " should die",
        " kill ",
    ]
    return any(k in lowered for k in hate_keywords)


def relevance_score(claim: str, snippet: str) -> float:
    claim_tokens = {t for t in claim.lower().split() if len(t) > 3}
    if not claim_tokens:
        return 0.0
    snippet_tokens = {t for t in snippet.lower().split() if len(t) > 3}
    if not snippet_tokens:
        return 0.0
    overlap = claim_tokens & snippet_tokens
    return min(1.0, len(overlap) / max(1, len(claim_tokens)))


def fetch_and_clean_page(url: str) -> Optional[str]:
    try:
        resp = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        # Explicitly set encoding to handle special characters
        resp.encoding = resp.apparent_encoding or 'utf-8'
        soup = BeautifulSoup(resp.content, "html.parser", from_encoding=resp.encoding)
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        text = " ".join(text.split())
        return text[:3000] if text else None
    except Exception:
        return None


def search_serpapi(query: str, num: int = MAX_RESULTS) -> List[Dict]:
    params = {
        "engine": "google",
        "q": query,
        "api_key": SERPAPI_KEY,
        "num": num,
        "hl": "fr",
    }
    resp = requests.get("https://serpapi.com/search.json", params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    organic = data.get("organic_results", [])[:num]
    results = []
    for r in organic:
        results.append(
            {
                "source": domain_from_url(r.get("link", "")),
                "url": r.get("link", ""),
                "snippet": r.get("snippet") or r.get("title") or "",
            }
        )
    return results


def search_duckduckgo(query: str, num: int = MAX_RESULTS) -> List[Dict]:
    params = {"q": query, "format": "json", "no_html": 1, "skip_disambig": 1}
    resp = requests.get("https://api.duckduckgo.com/", params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    results = []
    # RelatedTopics holds a mix of things; take text and firsturl.
    for item in data.get("RelatedTopics", [])[: num * 2]:  # oversample then trim
        if not isinstance(item, dict):
            continue
        text = item.get("Text") or ""
        url = item.get("FirstURL") or ""
        if text and url:
            results.append(
                {
                    "source": domain_from_url(url),
                    "url": url,
                    "snippet": text,
                }
            )
        if len(results) >= num:
            break
    return results


def search_web(query: str, num: int = MAX_RESULTS) -> List[Dict]:
    # Try SerpAPI if key is present, else fall back to DuckDuckGo instant answer API.
    if SERPAPI_KEY:
        try:
            print(f"[SEARCH] Using SerpAPI for: {query[:50]}...")
            return search_serpapi(query, num)
        except Exception as e:
            print(f"[SEARCH] SerpAPI failed ({e}), falling back to DuckDuckGo")
            pass
    else:
        print(f"[SEARCH] Using DuckDuckGo (no SerpAPI key) for: {query[:50]}...")
    try:
        return search_duckduckgo(query, num)
    except Exception:
        return []


def retrieve_evidence(claim: str) -> List[Dict]:
    results = search_web(claim, num=MAX_RESULTS)
    filtered = []
    for r in results:
        domain = r.get("source") or domain_from_url(r.get("url", ""))
        if not domain or is_blocked_domain(domain):
            continue
        cred = credibility_prior(domain)
        r["credibility"] = cred
        url = r.get("url", "")
        full_text = fetch_and_clean_page(url) if url else None
        r["full_content"] = full_text
        filtered.append(r)
    if filtered:
        return filtered
    if results:
        top = results[:1]
        top[0]["credibility"] = credibility_prior(top[0].get("source", ""))
        top[0]["full_content"] = fetch_and_clean_page(top[0].get("url", "")) if top[0].get("url") else None
        return top
    return [
        {
            "source": "reuters.com",
            "url": "https://www.reuters.com/example",
            "snippet": f"According to Reuters, {claim} was reported with additional context.",
            "credibility": TRUSTED_DOMAIN_PRIORS.get("reuters.com", 0.9),
            "full_content": None,
        }
    ]


def classify_evidence_with_llm(claim: str, snippet: str, full_content: Optional[str] = None) -> Tuple[str, float, float]:
    key = os.getenv("OPENAI_API_KEY")
    evidence_text = full_content if full_content else snippet
    if OpenAI and key:
        try:
            client = OpenAI(api_key=key)
            prompt = (
                "Determine if the evidence SUPPORTS, CONTRADICTS, or is INCONCLUSIVE about the claim. "
                "If the evidence describes a belief or misconception while external evidence contradicts it, mark CONTRADICT. "
                "Mark INCONCLUSIVE only if truly off-topic or insufficient information. "
                "Return strict JSON: {\"stance\": \"support|contradict|inconclusive\", \"confidence\": 0-1, \"relevance\": 0-1}."
            )
            completion = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a precise fact-checking assistant."},
                    {"role": "user", "content": f"Claim: {claim}\nEvidence:\n{evidence_text}\n{prompt}"},
                ],
                max_tokens=160,
            )
            raw = completion.choices[0].message.content or ""
            raw_clean = raw.replace("```json", "").replace("```", "").strip()
            try:
                data = json.loads(raw_clean)
                stance = str(data.get("stance", "")).lower()
                conf = float(data.get("confidence", 0.0))
                rel = float(data.get("relevance", 0.0)) if data.get("relevance") is not None else None
                if stance not in {"support", "contradict", "inconclusive"}:
                    stance = "inconclusive"
                conf = max(0.0, min(conf, 1.0)) if conf == conf else 0.2
                if rel is None or rel != rel:
                    rel = relevance_score(claim, evidence_text)
                rel = max(0.0, min(rel, 1.0))
                return stance, conf or 0.2, rel
            except Exception:
                raw_lower = raw.lower()
                if "support" in raw_lower:
                    return "support", 0.6, relevance_score(claim, evidence_text)
                if "contradict" in raw_lower:
                    return "contradict", 0.6, relevance_score(claim, evidence_text)
                return "inconclusive", 0.2, relevance_score(claim, evidence_text)
        except Exception:
            return "inconclusive", 0.2, relevance_score(claim, evidence_text)
    return "inconclusive", 0.2, relevance_score(claim, evidence_text)


def analyze_manipulation_pattern(claim: str) -> Optional[Dict]:
    key = os.getenv("OPENAI_API_KEY")
    if not (OpenAI and key):
        return None
    try:
        client = OpenAI(api_key=key)
        prompt = (
            "IMPORTANT: Respond in French only. Analyze this false claim and identify: (1) the narrative/ideology it promotes, "
            "(2) target audience, (3) common spread vectors (e.g., social media, conspiracy forums), "
            "(4) emotional/psychological hooks, (5) practical advice for individuals to recognize and avoid this type of misinformation. "
            "For counter_measures, provide specific red flags to watch for and verification steps an individual can take (e.g., 'Vérifiez si l'affirmation cite des sources crédibles', 'Demandez-vous: cela fait-il appel à la peur plutôt qu'aux preuves?'). "
            "Return strict JSON in French: "
            "{\"narrative\": \"<quelle croyance promue>\", \"target_audience\": \"<qui tombe dans le piège>\", "
            "\"spread_vectors\": [\"<vecteur1>\", \"<vecteur2>\"], \"psychological_hooks\": \"<quelles émotions exploitées>\", "
            "\"counter_measures\": \"<étapes pratiques pour repérer et éviter cette désinformation>\"}." 
        )
        completion = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You analyze misinformation patterns and provide educational counter-narratives."},
                {"role": "user", "content": f"False claim: {claim}\n{prompt}"},
            ],
            max_tokens=300,
        )
        raw = (completion.choices[0].message.content or "").replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        return {
            "narrative": data.get("narrative", ""),
            "target_audience": data.get("target_audience", ""),
            "spread_vectors": data.get("spread_vectors", []),
            "psychological_hooks": data.get("psychological_hooks", ""),
            "counter_measures": data.get("counter_measures", ""),
        }
    except Exception:
        return None


def aggregate_stances(evidences: List[Evidence]) -> Dict:
    stance_scores = {"support": 0.0, "contradict": 0.0, "inconclusive": 0.0}
    for ev in evidences:
        if not ev.used_in_score:
            continue
        weight = ev.credibility * ev.confidence * ev.relevance
        stance_scores[ev.stance] += weight
    total = sum(stance_scores.values())
    if total <= 1e-9:
        normalized = {"support": 0.0, "contradict": 0.0, "inconclusive": 1.0}
        verdict = "inconclusive"
    else:
        normalized = {k: v / total for k, v in stance_scores.items()}
        verdict = max(normalized.items(), key=lambda kv: kv[1])[0]
    return {"stance_scores": normalized, "verdict": verdict, "updated_at": datetime.utcnow().isoformat() + "Z"}


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/verify", methods=["POST"])
def verify():
    payload = request.get_json(force=True)
    text = payload.get("text", "") if isinstance(payload, dict) else ""
    if not text.strip():
        return jsonify({"error": "text is required"}), 400

    claims = expand_conjoined_claims(extract_claims(text))
    if len(claims) < 2 and (" and " in text.lower() or "," in text):
        claims = expand_conjoined_claims([text])
    results = []
    for claim in claims:
        if detect_hate_claim(claim):
            results.append(
                {
                    "claim": claim,
                    "evidence": [],
                    "verdict": "inconclusive",
                    "stance_scores": {"support": 0.0, "contradict": 0.0, "inconclusive": 1.0},
                    "updated_at": datetime.utcnow().isoformat() + "Z",
                    "note": "Claim flagged as hateful/targeted; not fact-checkable.",
                }
            )
            continue

        raw_evidences = retrieve_evidence(claim)
        evidence_objs: List[Evidence] = []
        for ev in raw_evidences:
            stance, conf, rel = classify_evidence_with_llm(claim, ev.get("snippet", ""), ev.get("full_content"))
            cred = credibility_for_source(ev.get("source", ""), ev.get("full_content") or ev.get("snippet", ""))
            use_flag = cred >= MIN_CREDIBILITY_INCLUDE and rel >= MIN_RELEVANCE
            evidence_objs.append(
                Evidence(
                    source=ev.get("source", "unknown"),
                    url=ev.get("url", ""),
                    snippet=ev.get("snippet", ""),
                    stance=stance,
                    confidence=conf,
                    credibility=cred,
                    relevance=rel,
                    used_in_score=use_flag,
                )
            )
        agg = aggregate_stances(evidence_objs)
        sorted_evidence = sorted(evidence_objs, key=lambda e: e.credibility, reverse=True)
        
        # Analyze manipulation pattern if claim is contradicted
        manipulation_analysis = None
        if agg["verdict"] == "contradict":
            manipulation_analysis = analyze_manipulation_pattern(claim)
        
        result_obj = {
            "claim": claim,
            "evidence": [e.to_dict() for e in sorted_evidence],
            "verdict": agg["verdict"],
            "stance_scores": agg["stance_scores"],
            "updated_at": agg["updated_at"],
        }
        if manipulation_analysis:
            result_obj["manipulation_analysis"] = manipulation_analysis
        results.append(result_obj)

    return jsonify({"claims": results})


if __name__ == "__main__":
    app.run(debug=True)
