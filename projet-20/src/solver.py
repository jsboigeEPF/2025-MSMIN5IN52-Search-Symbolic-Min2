"""Convenience wrapper pour construire le modèle et lancer la résolution."""
from .generator import circle_method
from .model import SchedulerModel

def build_pair_schedule(teams: list, rounds_mode: str = 'single'):
    # teams is list of names or indices; we use indices
    n = len(teams)
    base = circle_method(list(range(n)))  # returns indices
    if rounds_mode == 'single':
        return base
    elif rounds_mode == 'double':
        # second half: reverse home/away
        base2 = []
        for r in range(len(base)):
            pairs = [(b,a) for (a,b) in base[r]]
            base2.append(pairs)
        return base + base2
    else:
        raise ValueError('rounds_mode must be single or double')

def run(teams, rounds_mode='single', max_time=30, match_days_per_week=1):
    """
    Génère un calendrier optimisé.
    
    Args:
        teams: Liste des noms d'équipes
        rounds_mode: 'single' ou 'double'
        max_time: Temps maximum de résolution en secondes
        match_days_per_week: Nombre de jours de match par semaine (1-7)
    
    Returns:
        tuple: (schedule, objective, stats)
        - schedule: Liste de rounds groupés par semaine si match_days_per_week > 1
        - objective: Nombre de breaks
        - stats: Statistiques détaillées
    """
    pair_schedule = build_pair_schedule(teams, rounds_mode)
    model = SchedulerModel(teams, pair_schedule)
    schedule, obj, stats = model.solve(max_time_seconds=max_time)
    
    # convert indices to names
    named = []
    if schedule is None:
        return None, None, None
    for day in schedule:
        named.append([(teams[a], teams[b]) for (a,b) in day])
    
    # Note: match_days_per_week est utilisé côté frontend pour l'affichage calendrier
    # Le backend génère toujours un round-robin standard (1 round = 1 journée)
    # Le regroupement par semaine se fait dans la présentation du calendrier
    
    return named, obj, stats

if __name__ == '__main__':
    import argparse, json
    parser = argparse.ArgumentParser()
    parser.add_argument('--teams', default='data/teams_example.json')
    parser.add_argument('--rounds', choices=['single','double'], default='single')
    parser.add_argument('--max-time', type=int, default=30)
    args = parser.parse_args()
    teams = json.load(open(args.teams))
    sched, obj = run(teams, args.rounds, args.max_time)
    print('Objective (breaks):', obj)
    for r, day in enumerate(sched):
        print('Round', r+1, day)
