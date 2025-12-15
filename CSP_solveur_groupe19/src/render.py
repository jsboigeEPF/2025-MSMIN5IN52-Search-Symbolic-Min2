from __future__ import annotations
from typing import Dict, List
import yaml
from .knowledge import CISRec, ConfigTemplate, Usage, apply_rec_to_config, default_config_template


def render_yaml(
    recs: Dict[str, CISRec],
    selected_recs: List[str],
    firewall_tool: str,
    allow_ports: List[int],
    usage: Usage,
) -> str:
    cfg: ConfigTemplate = default_config_template()

    for rid in selected_recs:
        apply_rec_to_config(cfg, rid, usage)

    # Écraser / compléter ce que le solveur a décidé explicitement
    cfg.firewall_tool = firewall_tool
    cfg.firewall_default_deny = True  # par construction (4.2.7 ou 4.3.8)
    cfg.firewall_allow_ports = allow_ports

    out = {
        "asset": "debian12_linux_server",
        "usage": usage,
        "firewall": {
            "tool": cfg.firewall_tool,
            "default_deny_inbound": cfg.firewall_default_deny,
            "allow_ports": cfg.firewall_allow_ports,
        },
        "sysctl": cfg.sysctl,
        "sshd_config": cfg.sshd,
        "sudo": cfg.sudo,
        "pam": cfg.pam,
        "selected_cis_recommendations": [
            {
                "id": rid,
                "title": recs[rid].title,
                "level": recs[rid].level,
                "domain": recs[rid].domain,
                "cost": recs[rid].cost,
            }
            for rid in selected_recs
        ],
    }

    return yaml.safe_dump(out, sort_keys=False, allow_unicode=True)
