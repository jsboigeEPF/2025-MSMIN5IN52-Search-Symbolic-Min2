"""CLI principal: génère et exporte un calendrier.
Utiliser: python -m src.main --teams data/teams_example.json
"""
import argparse, json
from .solver import run
from .visualize import export_json, print_ascii

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--teams', required=True)
    parser.add_argument('--rounds', choices=['single','double'], default='single')
    parser.add_argument('--max-time', type=int, default=30)
    parser.add_argument('--out', default=None)
    args = parser.parse_args()

    teams = json.load(open(args.teams, encoding='utf-8'))
    schedule, obj = run(teams, args.rounds, args.max_time)
    if schedule is None:
        print('No solution found')
        return
    print('Objective (breaks):', obj)
    print_ascii(schedule)
    if args.out:
        export_json(schedule, args.out)
        print('Exported to', args.out)

if __name__ == '__main__':
    main()
