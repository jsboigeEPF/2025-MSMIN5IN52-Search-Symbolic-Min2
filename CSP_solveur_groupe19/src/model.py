from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

from ortools.sat.python import cp_model

from .knowledge import CISRec, Criticality, Usage


@dataclass
class SolveResult:
    status: str  # "OK" | "UNSAT"
    total_cost: Optional[int]
    selected_recs: List[str]
    firewall_tool: Optional[str]
    allow_ports: List[int]


def build_and_solve(
    recs: Dict[str, CISRec],
    criticality: Criticality,
    usage: Usage,
    must_recs: Set[str],
    open_ports: Set[int],
    prefer_firewall: Optional[str] = None,  # "ufw"|"nftables"|None
    time_limit_s: float = 10.0,
) -> SolveResult:
    model = cp_model.CpModel()

    # --- Variables : sélection des recommandations
    x: Dict[str, cp_model.IntVar] = {rid: model.NewBoolVar(f"rec_{rid}") for rid in recs.keys()}

    # --- Variable : choix outil pare-feu (exactement un)
    fw_ufw = model.NewBoolVar("fw_ufw")
    fw_nft = model.NewBoolVar("fw_nftables")
    model.Add(fw_ufw + fw_nft == 1)

    # --- Contraintes : recommandations obligatoires
    for rid in must_recs:
        if rid in x:
            model.Add(x[rid] == 1)

    # --- Contraintes : domains selon criticité (optionnel, mais utile si tu ajoutes des recs non voulues)
    # Ici on ne force pas tout un domaine, car on a déjà un noyau obligatoire + optimisation coût.

    # --- Contraintes : cohérence firewall
    # CIS 4.1.1 "only one firewall utility" -> traduit ici comme "exactement un tool choisi"
    # Ensuite, si tool=ufw => exiger recs UFW (4.2.1 + 4.2.7 + 4.2.6)
    # si tool=nftables => exiger recs nft (4.3.1 + 4.3.8 + 4.3.10)

    # UFW implies required recs
    for ufw_rec in ["4.2.1", "4.2.7", "4.2.6"]:
        if ufw_rec in x:
            model.Add(x[ufw_rec] == 1).OnlyEnforceIf(fw_ufw)

    # nftables implies required recs
    for nft_rec in ["4.3.1", "4.3.8", "4.3.10"]:
        if nft_rec in x:
            model.Add(x[nft_rec] == 1).OnlyEnforceIf(fw_nft)

    # Exclusion croisée : si ufw => ne pas sélectionner nft recs (et inverse)
    for nft_rec in ["4.3.1", "4.3.8", "4.3.10"]:
        if nft_rec in x:
            model.Add(x[nft_rec] == 0).OnlyEnforceIf(fw_ufw)
    for ufw_rec in ["4.2.1", "4.2.7", "4.2.6"]:
        if ufw_rec in x:
            model.Add(x[ufw_rec] == 0).OnlyEnforceIf(fw_nft)

    # Option : préférence de démonstration
    if prefer_firewall == "ufw":
        model.Add(fw_ufw == 1)
    elif prefer_firewall == "nftables":
        model.Add(fw_nft == 1)

    # --- Contraintes : criticité fort => imposer quelques L2 (si présents)
    if criticality == "fort":
        for rid, rec in recs.items():
            if rec.level == "L2" and rid in {"5.1.9", "5.3.3.1.3"}:
                model.Add(x[rid] == 1)

    # --- Contraintes : usage web => on “exige” que firewall open ports couvre 80/443 (modélisé dans la sortie)
    # Ici, comme on ne modélise pas chaque règle port en variable, on impose au moins le contrôle
    # "rules exist for all open ports" (déjà forcé via 4.2.6 ou 4.3.10).
    # Et on renvoie open_ports dans la config finale.
    # (Optionnel) : si usage interne, on n’autorise pas 80/443
    if usage == "interne":
        # juste une garde pour la démo
        if 80 in open_ports or 443 in open_ports:
            return SolveResult(
                status="UNSAT",
                total_cost=None,
                selected_recs=[],
                firewall_tool=None,
                allow_ports=[],
            )

    # --- Objectif : minimiser le coût total
    total_cost = sum(recs[rid].cost * x[rid] for rid in recs.keys())
    model.Minimize(total_cost)

    # --- Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_s

    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return SolveResult("UNSAT", None, [], None, [])

    selected = [rid for rid in recs.keys() if solver.Value(x[rid]) == 1]
    selected.sort()

    fw_tool = "ufw" if solver.Value(fw_ufw) == 1 else "nftables"
    ports_sorted = sorted(open_ports)

    return SolveResult(
        status="OK",
        total_cost=int(solver.Value(total_cost)),
        selected_recs=selected,
        firewall_tool=fw_tool,
        allow_ports=ports_sorted,
    )
