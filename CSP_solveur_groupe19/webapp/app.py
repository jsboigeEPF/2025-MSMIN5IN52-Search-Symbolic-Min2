from __future__ import annotations

from fastapi import FastAPI, Form
from fastapi.responses import HTMLResponse, Response
from fastapi.templating import Jinja2Templates
from starlette.requests import Request

from src.knowledge import build_recommendations
from src.policy import mandatory_recs, required_open_ports
from src.model import build_and_solve
from src.render import render_yaml

app = FastAPI(title="cyber CSP Configurator")
templates = Jinja2Templates(directory="webapp/templates")


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "criticalities": ["faible", "moyen", "fort"],
            "usages": ["interne", "web"],
            "firewall_prefs": ["auto", "ufw", "nftables"],
        },
    )


@app.post("/generate")
def generate(
    criticality: str = Form(...),
    usage: str = Form(...),
    prefer_firewall: str = Form("auto"),
):
    if criticality not in {"faible", "moyen", "fort"}:
        return Response("Invalid criticality", status_code=400)
    if usage not in {"interne", "web"}:
        return Response("Invalid usage", status_code=400)
    if prefer_firewall not in {"auto", "ufw", "nftables"}:
        return Response("Invalid firewall preference", status_code=400)

    recs = build_recommendations()
    must = mandatory_recs(criticality, usage, recs)
    ports = required_open_ports(usage)

    pref = None if prefer_firewall == "auto" else prefer_firewall

    res = build_and_solve(
        recs=recs,
        criticality=criticality,
        usage=usage,
        must_recs=must,
        open_ports=ports,
        prefer_firewall=pref,
    )

    if res.status != "OK":
        return Response("UNSAT: aucune configuration ne satisfait les contraintes.", status_code=409)

    yaml_text = render_yaml(
        recs=recs,
        selected_recs=res.selected_recs,
        firewall_tool=res.firewall_tool or "ufw",
        allow_ports=res.allow_ports,
        usage=usage,
    )

    filename = f"debian12_{usage}_{criticality}.yaml"
    return Response(
        content=yaml_text,
        media_type="application/x-yaml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
