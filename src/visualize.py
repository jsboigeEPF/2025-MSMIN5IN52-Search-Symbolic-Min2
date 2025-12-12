"""Export simple : JSON & pretty-print ASCII."""
import json
from typing import List, Tuple

def export_json(schedule: List[List[Tuple[str,str]]], outpath: str):
    payload = []
    for r, day in enumerate(schedule):
        payload.append({
            'round': r+1,
            'matches': [{'home': h, 'away': a} for (h,a) in day]
        })
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

def print_ascii(schedule: List[List[Tuple[str,str]]]):
    for r, day in enumerate(schedule):
        print(f"=== Round {r+1} ===")
        for (h,a) in day:
            print(f"{h} vs {a}")
        print()

if __name__ == '__main__':
    s = [[('Team A','Team B'),('Team C','Team D')],[('Team B','Team C'),('Team D','Team A')]]
    print_ascii(s)
    export_json(s,'demo_schedule.json')
