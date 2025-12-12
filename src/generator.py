"""Génération des rencontres avec la méthode du cercle (round-robin).
Supporte single et double round-robin, avec équipes paires ou impaires.
"""
from typing import List, Tuple

def circle_method(teams: List[int]) -> List[List[Tuple[int,int]]]:
    """Retourne une list de rounds ; chaque round est une list de paires (home_idx, away_idx).
    Cette implémentation renvoie un single round-robin pour n équipes (paire ou impaire).
    Si n est impair, une équipe aura un "bye" (repos) à chaque journée.
    teams: list of indices (ints)
    """
    n = len(teams)
    
    # Si nombre impair, ajouter une équipe fictive (-1 = bye)
    if n % 2 == 1:
        teams_extended = teams + [-1]
        n_ext = n + 1
    else:
        teams_extended = list(teams)
        n_ext = n
    
    rounds = n_ext - 1
    idxs = list(teams_extended)
    schedule = []
    
    for r in range(rounds):
        pairs = []
        for i in range(n_ext // 2):
            a = idxs[i]
            b = idxs[n_ext - 1 - i]
            # Exclure les matchs avec l'équipe fictive (-1)
            if a != -1 and b != -1:
                pairs.append((a, b))
        # rotate all but first
        idxs = [idxs[0]] + [idxs[-1]] + idxs[1:-1]
        schedule.append(pairs)
    
    return schedule

# helper pour convertir indices vers noms
def schedule_with_names(schedule, teams):
    out = []
    for r,pairs in enumerate(schedule):
        out.append([(teams[a], teams[b]) for (a,b) in pairs])
    return out

if __name__ == '__main__':
    teams = [f"Team {c}" for c in ['A','B','C','D','E','F']]
    sched = circle_method(list(range(len(teams))))
    for i, r in enumerate(schedule_with_names(sched, teams)):
        print(f"Round {i+1}: {r}")
