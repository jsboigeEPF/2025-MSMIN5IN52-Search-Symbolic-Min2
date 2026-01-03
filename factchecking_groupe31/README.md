# Check-it! - Système de Vérification d'Affirmations

Ce projet implémente un système automatisé de fact-checking et de détection de désinformation utilisant l'intelligence artificielle pour extraire des affirmations, récupérer des preuves web, évaluer la crédibilité des sources, et analyser les techniques de manipulation informationnelle.

## Groupe 31

### Marilson SOUZA
### Brenda KOUNDJO
### Xiner GU

## Prérequis

- Python 3.8 ou supérieur
- Clés API OpenAI (requise)
- Clé API SerpAPI (optionnelle, pour recherche Google)

## Installation

1. Créer un environnement virtuel :
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Sur Windows
   ```

2. Installer les dépendances :
   ```bash
   pip install -r requirements.txt
   ```

3. Configurer les clés API :
   Éditer `.env` avec vos clés API :
   - `OPENAI_API_KEY` (requis)
   - `SERPAPI_API_KEY` (optionnel, utilise DuckDuckGo sinon)
   - `OPENAI_MODEL` (optionnel, défaut: `gpt-4o-mini`)

## Utilisation

### Interface web
1. Lancer l'application Flask :
   ```bash
   flask --app app run --debug
   ```
2. Ouvrir http://127.0.0.1:5000 dans votre navigateur
3. Coller une affirmation ou un texte contenant plusieurs affirmations
4. Cliquer sur "Vérifier" pour lancer l'analyse
 
### Fonctionnalités

#### Pipeline de vérification
1. **Extraction d'affirmations** : L'IA extrait les affirmations atomiques et vérifiables du texte. Gère les affirmations conjointes ("A et B" → séparation en deux affirmations).

2. **Récupération de preuves** : Recherche web (SerpAPI ou DuckDuckGo) avec récupération du contenu complet des pages (jusqu'à 6 sources par affirmation). Filtrage des domaines bloqués (Reddit, Medium, Quora, etc.).

3. **Évaluation de crédibilité** :
   - Scoring dynamique par LLM avec mise en cache persistante
   - Priors manuels pour sources de confiance (Reuters, AFP, fact-checkers IFCN)
   - Plafonnement automatique pour réseaux sociaux (max 30%)
   - Guidelines strictes : 0.9-1.0 = revues scientifiques uniquement, 0.7-0.85 = médias réputés

4. **Classification des preuves** : Analyse par LLM de chaque source (supporte/contredit/inconclusif) avec score de confiance et pertinence.

5. **Agrégation pondérée** : Verdict final calculé par `crédibilité × confiance × pertinence`, normalisé par affirmation.

6. **Analyse de manipulation** (pour affirmations contredites) :
   - Identification de la narrative promue
   - Cible et audience visée
   - Canaux de propagation (réseaux sociaux, forums, etc.)
   - Ressorts psychologiques exploités
   - Conseils pratiques pour se protéger

#### Interface utilisateur
- **Barre de progression animée** pendant l'analyse
- **Résultats colorés** selon le verdict :
  - Vert = affirmation supportée
  - Rouge = affirmation contredite
  - Jaune = inconclusif
- **Animation progressive** : affirmations et sources apparaissent une par une
- **Bouton "En savoir plus"** sur affirmations fausses → modal d'analyse de désinformation
- **Sources triées** par crédibilité décroissante
- **Détection de propos haineux** (filtrage automatique)

### Remarques d'exploitation

- OpenAI API requis pour extraction, classification et analyse de manipulation
- Cache de crédibilité sauvegardé dans `cred_cache.json` pour éviter appels API redondants
- SerpAPI recommandé pour meilleurs résultats de recherche (limite gratuite: 100 recherches/mois)
- BeautifulSoup utilisé pour extraction de contenu web propre (évite snippets tronqués)

### Extensions possibles

- Intégration de modèles NLI locaux (remplacer appels OpenAI pour stance)
- Analyse de propagation réseau (graphes de diffusion)
- Détection de patterns de manipulation (clickbait, chargement émotionnel)
- Export des rapports en PDF
- API avec authentification et rate limiting
- Support multilingue étendu

## Structure du projet

- `app.py` : Application Flask principale avec pipeline complet
- `templates/index.html` : Interface web avec animations et modal
- `requirements.txt` : Dépendances Python
- `.env.example` : Template de configuration
- `cred_cache.json` : Cache de crédibilité des domaines (généré automatiquement)

## Configuration avancée

### Constantes clés dans `app.py`
- `TRUSTED_DOMAIN_PRIORS` : Liste des domaines de confiance avec scores manuels
- `DEFAULT_NEUTRAL_PRIOR = 0.45` : Score par défaut pour domaines inconnus
- `MIN_CREDIBILITY_INCLUDE = 0.6` : Seuil pour inclusion dans verdict
- `MIN_RELEVANCE = 0.35` : Seuil de pertinence
- `MAX_RESULTS = 6` : Nombre max de sources par affirmation
- `BLOCKED_DOMAINS` : Liste noire (Reddit, Medium, etc.)
- `UGC_DOMAINS` : Réseaux sociaux (plafonnés à 30%)
- `MAX_CRED_FOR_UGC = 0.3` : Plafond pour contenu généré par utilisateurs

## Endpoints API

### `POST /api/verify`
Analyse une ou plusieurs affirmations.

**Corps de requête :**
```json
{ "text": "Le vaccin COVID réduit les hospitalisations de 60%" }
```

**Réponse :**
```json
{
  "claims": [
    {
      "claim": "Le vaccin COVID réduit les hospitalisations de 60%",
      "verdict": "support",
      "stance_scores": {
        "support": 0.85,
        "contradict": 0.10,
        "inconclusive": 0.05
      },
      "evidence": [
        {
          "source": "who.int",
          "url": "https://...",
          "snippet": "...",
          "stance": "support",
          "credibility": 0.9,
          "confidence": 0.85,
          "relevance": 0.92,
          "used_in_score": true
        }
      ],
      "updated_at": "2026-01-03T19:45:00Z",
      "manipulation_analysis": null
    }
  ]
}
```

### `GET /`
Interface web simple avec textarea et bouton de vérification.
