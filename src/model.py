"""Modèle CP-SAT pour décider domicile/extérieur et minimiser les breaks.
"""
from ortools.sat.python import cp_model
from typing import List, Dict, Tuple

class SchedulerModel:
    def __init__(self, teams: List[str], pair_schedule: List[List[Tuple[int,int]]], max_away_consec: int = 3):
        self.teams = teams
        self.n = len(teams)
        self.pair_schedule = pair_schedule  # list of rounds, each list of (a,b) indices (unordered)
        self.rounds = len(pair_schedule)
        self.max_away = max_away_consec

        self.model = cp_model.CpModel()
        self.M = {}  # M[(t,i,j)] bool: i receives j at round t
        self.home = {}
        self.breaks = {}
        self._build()

    def _build(self):
        # create variables only for pairs scheduled in each round
        for t in range(self.rounds):
            for (a,b) in self.pair_schedule[t]:
                # two possibles: a receives b, or b receives a
                self.M[(t,a,b)] = self.model.NewBoolVar(f"M_r{t}_h{a}_a{b}")
                self.M[(t,b,a)] = self.model.NewBoolVar(f"M_r{t}_h{b}_a{a}")
                # mutual exclusion: either a receives b xor b receives a
                self.model.Add(self.M[(t,a,b)] + self.M[(t,b,a)] == 1)

        # home vars
        for t in range(self.rounds):
            for i in range(self.n):
                self.home[(t,i)] = self.model.NewBoolVar(f"home_r{t}_team{i}")
                # link: home == M[(t,i,opp)] for the opponent in that round
                # find opponent j in that round
                has_match = False
                for (a,b) in self.pair_schedule[t]:
                    if a == i:
                        opp = b
                        self.model.Add(self.home[(t,i)] == self.M[(t,i,opp)])
                        has_match = True
                        break
                    if b == i:
                        opp = a
                        self.model.Add(self.home[(t,i)] == self.M[(t,i,opp)])
                        has_match = True
                        break
                # Si l'équipe a un bye (pas de match ce tour), on fixe home à 0
                if not has_match:
                    self.model.Add(self.home[(t,i)] == 0)

        # breaks
        for t in range(1, self.rounds):
            for i in range(self.n):
                D = self.model.NewBoolVar(f"D_r{t}_team{i}")
                # D >= home_t - home_t-1 ; D >= home_t-1 - home_t
                self.model.Add(self.home[(t,i)] - self.home[(t-1,i)] <= D)
                self.model.Add(self.home[(t-1,i)] - self.home[(t,i)] <= D)
                S = self.model.NewBoolVar(f"break_r{t}_team{i}")
                self.model.Add(S + D == 1)  # S = 1 - D
                self.breaks[(t,i)] = S

        # max consecutive away windows
        for i in range(self.n):
            for t0 in range(0, self.rounds - self.max_away + 1):
                window = [1 - self.home[(t,i)] for t in range(t0, t0 + self.max_away)]
                self.model.Add(sum(window) <= self.max_away)

        # CONTRAINTE D'ÉQUITÉ : Forcer un équilibre domicile/extérieur
        # TEMPORAIREMENT DÉSACTIVÉE pour diagnostic
        # TODO: Réactiver avec une approche différente
        pass

        # objective placeholder
        self.model.Minimize(sum(self.breaks.values()))

    def solve(self, max_time_seconds: int = 30, workers: int = 8):
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = max_time_seconds
        solver.parameters.num_search_workers = workers
        res = solver.Solve(self.model)
        if res in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            schedule = []
            for t in range(self.rounds):
                day = []
                for (a,b) in self.pair_schedule[t]:
                    if solver.Value(self.M[(t,a,b)]) == 1:
                        day.append((a,b))  # a receives b
                    elif solver.Value(self.M[(t,b,a)]) == 1:
                        day.append((b,a))
                schedule.append(day)
            objective = solver.ObjectiveValue()
            stats = self.get_statistics(solver)
            return schedule, objective, stats
        else:
            return None, None, None
    
    def get_statistics(self, solver: cp_model.CpSolver):
        """Retourne des statistiques détaillées sur la solution."""
        stats = {
            'total_breaks': int(solver.ObjectiveValue()),
            'breaks_per_team': {},
            'home_away_balance': {},
            'consecutive_away': {},
            'consecutive_home': {},
            'opponent_variety': {},
            'total_travel_distance': {}
        }
        
        for i in range(self.n):
            # Compter les breaks par équipe
            team_breaks = sum(solver.Value(self.breaks[(t,i)]) for t in range(1, self.rounds) if (t,i) in self.breaks)
            stats['breaks_per_team'][self.teams[i]] = int(team_breaks)
            
            # Balance domicile/extérieur
            home_count = sum(solver.Value(self.home[(t,i)]) for t in range(self.rounds))
            away_count = self.rounds - int(home_count)
            stats['home_away_balance'][self.teams[i]] = {
                'home': int(home_count),
                'away': away_count
            }
            
            # Nombre de déplacements (matchs à l'extérieur)
            stats['total_travel_distance'][self.teams[i]] = away_count
            
            # Variété des adversaires affrontés
            opponents_faced = set()
            for t in range(self.rounds):
                for (a, b) in self.pair_schedule[t]:
                    if a == i:
                        opponents_faced.add(b)
                    elif b == i:
                        opponents_faced.add(a)
            stats['opponent_variety'][self.teams[i]] = len(opponents_faced)
            
            # Séquences consécutives
            max_away_streak = 0
            max_home_streak = 0
            current_away = 0
            current_home = 0
            
            for t in range(self.rounds):
                if solver.Value(self.home[(t,i)]) == 1:
                    current_home += 1
                    current_away = 0
                    max_home_streak = max(max_home_streak, current_home)
                else:
                    current_away += 1
                    current_home = 0
                    max_away_streak = max(max_away_streak, current_away)
            
            stats['consecutive_away'][self.teams[i]] = max_away_streak
            stats['consecutive_home'][self.teams[i]] = max_home_streak
        
        return stats
