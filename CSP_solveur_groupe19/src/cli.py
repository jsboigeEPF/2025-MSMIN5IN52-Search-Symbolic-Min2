from __future__ import annotations
import argparse
from .knowledge import Criticality, Usage, build_recommendations
from .policy import mandatory_recs, required_open_ports
from .model import build_and_solve
from .render import render_yaml


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="CIS Debian 12 CSP Configurator (MVP)")
    p.add_argument("--criticality", choices=["faible", "moyen", "fort"], required=True)
    p.add_argument("--usage", choices=["interne", "web"], required=True)
    p.add_argument("--prefer-firewall", choices=["ufw", "nftables"], default=None)
    p.add_argument("--out", default=None, help="write YAML to file")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    criticality: Criticality = args.criticality
    usage: Usage = args.usage

    recs = build_recommendations()
    must = mandatory_recs(criticality, usage, recs)
    ports = required_open_ports(usage)

    res = build_and_solve(
        recs=recs,
        criticality=criticality,
        usage=usage,
        must_recs=must,
        open_ports=ports,
        prefer_firewall=args.prefer_firewall,
    )

    if res.status != "OK":
        print("UNSAT: aucune configuration ne satisfait les contraintes.")
        return

    print("OK")
    print("Total cost:", res.total_cost)
    print("Firewall tool:", res.firewall_tool)
    print("Allowed ports:", res.allow_ports)
    print("Selected CIS recs:", ", ".join(res.selected_recs))

    yml = render_yaml(recs, res.selected_recs, res.firewall_tool or "ufw", res.allow_ports, usage)
    print("\n--- YAML CONFIG ---\n")
    print(yml)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(yml)
        print(f"Wrote YAML to {args.out}")


if __name__ == "__main__":
    main()
