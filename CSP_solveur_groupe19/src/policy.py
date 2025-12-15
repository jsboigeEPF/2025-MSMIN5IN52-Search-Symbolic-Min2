from __future__ import annotations

from typing import Dict, Set

from .knowledge import CISRec, Criticality, Usage


def required_domains_by_criticality(criticality: Criticality) -> Set[str]:
    """
    Criticité pilote l’ambition :
    - faible : socle (sysctl + pare-feu + ssh minimal)
    - moyen  : + sudo + pam L1
    - fort   : + items L2 (durcissement plus strict)
    """
    if criticality == "faible":
        return {"sysctl", "firewall", "ssh"}
    if criticality == "moyen":
        return {"sysctl", "firewall", "ssh", "sudo", "pam"}
    return {"sysctl", "firewall", "ssh", "sudo", "pam"}  # fort = mêmes domaines, mais plus de L2


def mandatory_recs(criticality: Criticality, usage: Usage, recs: Dict[str, CISRec]) -> Set[str]:
    """
    Choix d’un petit noyau obligatoire pour rendre la démo cohérente.
    """
    must: Set[str] = set()

    # Réseau/sysctl minimal
    for rid in ["3.3.1", "3.3.2", "3.3.5", "3.3.7", "3.3.10"]:
        if rid in recs:
            must.add(rid)

    # Firewall : toujours exiger "un seul outil" + default deny + règles open ports
    must.add("4.1.1")
    # Le choix ufw/nftables sera décidé par le solveur (variable firewall_tool),
    # mais on force ensuite les recs correspondantes.

    # SSH minimal : no root + pas empty passwords + timeouts
    for rid in ["5.1.19", "5.1.20", "5.1.7", "5.1.16"]:
        if rid in recs:
            must.add(rid)

    # Niveau moyen/fort : sudo + PAM
    if criticality in {"moyen", "fort"}:
        for rid in ["5.2.1", "5.2.2", "5.2.3"]:
            if rid in recs:
                must.add(rid)
        for rid in ["5.3.2.1", "5.3.3.1.1", "5.3.3.1.2", "5.3.3.2.1"]:
            if rid in recs:
                must.add(rid)

    # Niveau fort : ajouter des renforcements L2
    if criticality == "fort":
        for rid in ["5.1.9", "5.3.3.1.3"]:
            if rid in recs:
                must.add(rid)

    return must


def required_open_ports(usage: Usage) -> Set[int]:
    """
    Règle simple pilotée par usage :
    - web : 80/443 + SSH (22) pour admin
    - interne : uniquement SSH (22) par défaut
    """
    if usage == "web":
        return {22, 80, 443}
    return {22}
