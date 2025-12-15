import random
import time
from typing import List, Dict, Tuple, Set


def generer_preferences(n: int, incomplete: bool = False) -> Tuple[List[List[int]], List[List[int]]]:
    """préférences aléatoires pour n hommes et n femmes"""
    men_prefs = []
    women_prefs = []
    
    for i in range(n):
        # Créer une liste complète et la mélanger
        men_pref = list(range(n))
        women_pref = list(range(n))
        
        random.shuffle(men_pref)
        random.shuffle(women_pref)
        
        # Si listes incomplètes, garder seulement 60-100%
        if incomplete:
            men_cutoff = random.randint(int(n * 0.6), n)
            women_cutoff = random.randint(int(n * 0.6), n)
            men_pref = men_pref[:men_cutoff]
            women_pref = women_pref[:women_cutoff]
        
        men_prefs.append(men_pref)
        women_prefs.append(women_pref)
    
    return men_prefs, women_prefs


def gale_shapley(men_prefs: List[List[int]], women_prefs: List[List[int]]) -> Tuple[List[int], List[int], int]:
    """
    Algo de Gale-Shapley
    """
    n = len(men_prefs)
    
    # Initialisation
    men_partner = [-1] * n
    women_partner = [-1] * n
    men_next_proposal = [0] * n
    
    # Créer un dictionnaire de classement pour les femmes (optimisation)
    women_ranking = []
    for w_prefs in women_prefs:
        ranking = {man: rank for rank, man in enumerate(w_prefs)}
        women_ranking.append(ranking)
    
    # Liste des hommes libres
    free_men = list(range(n))
    etapes = 0
    
    while free_men and etapes < n * n:
        man = free_men.pop(0)
        etapes += 1
        
        # Si l'homme a épuisé sa liste
        if men_next_proposal[man] >= len(men_prefs[man]):
            continue
        
        woman = men_prefs[man][men_next_proposal[man]]
        men_next_proposal[man] += 1
        
        # Si l'homme n'est pas acceptable pour la femme
        if man not in women_ranking[woman]:
            free_men.append(man)
            continue
        
        # Si la femme est libre
        if women_partner[woman] == -1:
            women_partner[woman] = man
            men_partner[man] = woman
        else:
            current = women_partner[woman]
            
            # La femme compare les deux prétendants
            if women_ranking[woman][man] < women_ranking[woman][current]:
                # Elle préfère le nouveau
                women_partner[woman] = man
                men_partner[man] = woman
                men_partner[current] = -1
                free_men.append(current)
            else:
                # Elle garde l'actuel
                free_men.append(man)
    
    return men_partner, women_partner, etapes


def verifier_stabilite(men_partner: List[int], women_partner: List[int], 
                       men_prefs: List[List[int]], women_prefs: List[List[int]]) -> List[Tuple[int, int]]:
    """Vérifie la stabilité et retourne les paires bloquantes"""
    n = len(men_partner)
    blocking_pairs = []
    
    for man in range(n):
        woman = men_partner[man]
        if woman == -1:
            continue
        
        # Rang de la partenaire actuelle
        woman_rank = men_prefs[man].index(woman) if woman in men_prefs[man] else float('inf')
        
        # Vérifier toutes les femmes préférées
        for i, preferred_woman in enumerate(men_prefs[man]):
            if i >= woman_rank:
                break
            
            current_partner = women_partner[preferred_woman]
            if current_partner == -1:
                continue
            
            # Vérifier si cette femme préfère man à son partenaire actuel
            if man in women_prefs[preferred_woman] and current_partner in women_prefs[preferred_woman]:
                man_rank = women_prefs[preferred_woman].index(man)
                current_rank = women_prefs[preferred_woman].index(current_partner)
                
                if man_rank < current_rank:
                    blocking_pairs.append((man, preferred_woman))
    
    return blocking_pairs


def csp_avec_arc_consistance(men_prefs: List[List[int]], women_prefs: List[List[int]]) -> Dict:
    """Résolution CSP avec arc-consistance et backtracking"""
    start_time = time.time()
    n = len(men_prefs)
    
    # Initialiser les domaines
    domains = {man: list(men_prefs[man]) for man in range(n)}
    
    # Phase d'arc-consistance
    changed = True
    while changed:
        changed = False
        for man in range(n):
            to_remove = []
            for woman in domains[man]:
                if man not in women_prefs[woman]:
                    to_remove.append(woman)
            
            if to_remove:
                for w in to_remove:
                    domains[man].remove(w)
                changed = True
    
    # Backtracking
    assignment = [-1] * n
    women_assignment = [-1] * n
    backtracks = [0]
    
    def est_consistant(man: int, woman: int) -> bool:
        # Vérifier que la femme est libre
        if women_assignment[woman] != -1:
            return False
        
        # Vérifier qu'il n'y a pas de paire bloquante
        for m in range(man):
            w = assignment[m]
            if w == -1:
                continue
            
            # Vérifier paire (m, woman)
            if woman in men_prefs[m]:
                m_pref_woman = men_prefs[m].index(woman)
                m_pref_w = men_prefs[m].index(w)
                if m_pref_woman < m_pref_w:
                    if m in women_prefs[woman] and man in women_prefs[woman]:
                        woman_pref_m = women_prefs[woman].index(m)
                        woman_pref_man = women_prefs[woman].index(man)
                        if woman_pref_m < woman_pref_man:
                            return False
            
            # Vérifier paire (man, w)
            if w in men_prefs[man]:
                man_pref_w = men_prefs[man].index(w)
                man_pref_woman = men_prefs[man].index(woman)
                if man_pref_w < man_pref_woman:
                    if man in women_prefs[w] and m in women_prefs[w]:
                        w_pref_man = women_prefs[w].index(man)
                        w_pref_m = women_prefs[w].index(m)
                        if w_pref_man < w_pref_m:
                            return False
        
        return True
    
    def backtrack(man: int) -> bool:
        if man == n:
            return True
        
        for woman in domains[man]:
            if est_consistant(man, woman):
                assignment[man] = woman
                women_assignment[woman] = man
                
                if backtrack(man + 1):
                    return True
                
                assignment[man] = -1
                women_assignment[woman] = -1
                backtracks[0] += 1
        
        return False
    
    found = backtrack(0)
    end_time = time.time()
    
    return {
        'found': found,
        'men_partner': assignment if found else None,
        'women_partner': women_assignment if found else None,
        'backtracks': backtracks[0],
        'time': (end_time - start_time) * 1000,
        'domains_after_ac': [len(domains[m]) for m in range(n)]
    }


def afficher_preferences(men_prefs: List[List[int]], women_prefs: List[List[int]]):
    """Affiche les préférences"""
    print("\n=== PRÉFÉRENCES ===")
    print("\nHommes:")
    for i, prefs in enumerate(men_prefs):
        print(f"  H{i}: {' > '.join(f'F{w}' for w in prefs)}")
    
    print("\nFemmes:")
    for i, prefs in enumerate(women_prefs):
        print(f"  F{i}: {' > '.join(f'H{m}' for m in prefs)}")


def afficher_matching(men_partner: List[int], title: str, blocking_pairs: List[Tuple[int, int]] = None):
    """Affiche un matching"""
    print(f"\n=== {title} ===")
    for man, woman in enumerate(men_partner):
        if woman != -1:
            print(f"  H{man} → F{woman}")
        else:
            print(f"  H{man} → Non apparié")
    
    if blocking_pairs is not None:
        if blocking_pairs:
            print(f"\nINSTABLE - Paires bloquantes: {blocking_pairs}")
        else:
            print("\nSTABLE - Aucune paire bloquante")


def main():

    # Config
    n = 10  # Nombre d'hommes/femmes
    incomplete = True
    
    print(f"\nConfiguration: n={n}, listes_incomplètes={incomplete}")
    
    # Génération
    men_prefs, women_prefs = generer_preferences(n, incomplete)
    afficher_preferences(men_prefs, women_prefs)
    
    # Gale-Shapley
    print("\n" + "=" * 60)
    print("ALGORITHME DE GALE-SHAPLEY")
    print("=" * 60)
    
    gs_men, gs_women, gs_steps = gale_shapley(men_prefs, women_prefs)
    gs_blocking = verifier_stabilite(gs_men, gs_women, men_prefs, women_prefs)
    
    afficher_matching(gs_men, "Résultat Gale-Shapley", gs_blocking)
    print(f"\nNombre d'étapes: {gs_steps}")
    
    # CSP
    print("\n" + "=" * 60)
    print("RÉSOLUTION CSP AVEC ARC-CONSISTANCE")
    print("=" * 60)
    
    csp_result = csp_avec_arc_consistance(men_prefs, women_prefs)
    
    if csp_result['found']:
        csp_blocking = verifier_stabilite(csp_result['men_partner'], csp_result['women_partner'], 
                                         men_prefs, women_prefs)
        afficher_matching(csp_result['men_partner'], "Résultat CSP", csp_blocking)
        print(f"\nBacktracks: {csp_result['backtracks']}")
        print(f"Temps: {csp_result['time']:.2f} ms")
        print(f"Domaines après AC: {csp_result['domains_after_ac']}")
    else:
        print("\n == aucune solution trouvée ==")
    
    # Comparaison
    if csp_result['found']:
        print("\n" + "=" * 60)
        print("COMPARAISON")
        print("=" * 60)
        
        same = gs_men == csp_result['men_partner']
        print(f"\nRésultats identiques: {'Oui' if same else 'Non (les deux peuvent être stables)'}")
        
        print("\nGale-Shapley:")
        print(f"  - Complexité: O(n²)")
        print(f"  - Étapes: {gs_steps}")
        print(f"  - Garantit stabilité")
        
        print("\nCSP:")
        print(f"  - Complexité: Exponentielle (pire cas)")
        print(f"  - Backtracks: {csp_result['backtracks']}")
        print(f"  - Arc-consistance réduit les domaines")
        print(f"  - Plus flexible pour variantes")


if __name__ == "__main__":
    main()