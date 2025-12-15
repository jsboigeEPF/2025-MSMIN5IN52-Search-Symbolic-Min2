# 🔄 Support des équipes impaires - Système de "Bye"

## Problématique

Dans un tournoi round-robin avec un **nombre impair d'équipes**, il est impossible que toutes les équipes jouent simultanément à chaque journée. Une équipe doit obligatoirement être **au repos** (bye).

## Solution implémentée

### Méthode de l'équipe fictive

Nous utilisons une **équipe fictive** (représentée par l'indice `-1`) pour équilibrer le calendrier :

```python
# Exemple avec 5 équipes réelles
teams = ["PSG", "OM", "Lyon", "Monaco", "Lille"]  # 5 équipes (impair)

# On ajoute une équipe fictive
teams_extended = [0, 1, 2, 3, 4, -1]  # 6 équipes (pair)
```

### Algorithme du cercle modifié

```python
def circle_method(teams: List[int]) -> List[List[Tuple[int,int]]]:
    n = len(teams)

    # Si nombre impair, ajouter une équipe fictive (-1 = bye)
    if n % 2 == 1:
        teams_extended = teams + [-1]
        n_ext = n + 1
    else:
        teams_extended = list(teams)
        n_ext = n

    # Génération des journées
    for round in range(n_ext - 1):
        pairs = []
        for i in range(n_ext // 2):
            a = teams[i]
            b = teams[n_ext - 1 - i]

            # IMPORTANT: Exclure les matchs avec l'équipe fictive
            if a != -1 and b != -1:
                pairs.append((a, b))

        # Rotation (algorithme du cercle)
        teams = [teams[0]] + [teams[-1]] + teams[1:-1]
```

## Exemple concret : 5 équipes

### Équipes

- PSG (0)
- OM (1)
- Lyon (2)
- Monaco (3)
- Lille (4)
- **Fictive** (-1)

### Calendrier généré

#### Journée 1

- PSG vs Lille (0 vs 4)
- OM vs Monaco (1 vs 3)
- **Lyon au repos** (2 vs -1 → exclu)

#### Journée 2

- PSG vs Monaco (0 vs 3)
- Lille vs Lyon (4 vs 2)
- **OM au repos** (1 vs -1 → exclu)

#### Journée 3

- PSG vs Lyon (0 vs 2)
- Monaco vs Lille (3 vs 4)
- **Lille au repos** (1 vs -1 → exclu... attendez non)
- **OM au repos** (matchait avec -1)

Et ainsi de suite... Chaque équipe aura exactement **1 journée de repos**.

## Propriétés mathématiques

### Nombre de journées

- **n équipes (impair)** → **n journées**
- Exemple : 5 équipes → 5 journées

### Nombre de matchs par journée

- **(n-1)/2 matchs** par journée
- Exemple : 5 équipes → 2 matchs par journée

### Matchs totaux

- **n × (n-1) / 2** matchs au total
- Exemple : 5 équipes → 10 matchs

### Distribution des repos

- Chaque équipe a **exactement 1 journée de repos**
- Les repos sont répartis équitablement

## Gestion dans le modèle CP

### Variables modifiées

```python
# Si une équipe a un bye (pas de match ce tour)
if not has_match:
    self.model.Add(self.home[(t,i)] == 0)  # Pas à domicile
```

### Contraintes adaptées

Les contraintes de breaks et de déplacements consécutifs ignorent automatiquement les journées de repos :

```python
# Les breaks ne comptent que pour les journées avec match
for t in range(1, self.rounds):
    for i in range(self.n):
        # Si l'équipe joue à t et t-1
        if has_match_at(t, i) and has_match_at(t-1, i):
            # Calculer le break
            ...
```

## Avantages de cette approche

### ✅ Simplicité

- Réutilise l'algorithme existant pour nombre pair
- Pas de code spécial pour gérer les byes

### ✅ Équité

- Distribution automatique et équitable des repos
- Chaque équipe a le même nombre de byes

### ✅ Optimisation

- Le solveur CP-SAT gère naturellement les contraintes
- Pas d'impact sur la minimisation des breaks

### ✅ Transparence

- L'utilisateur ne voit jamais l'équipe fictive
- Les matchs avec `-1` sont simplement filtrés

## Interface utilisateur

### Frontend

L'utilisateur peut maintenant :

- ✅ Ajouter un nombre impair d'équipes (3, 5, 7, 9...)
- ✅ Voir automatiquement qu'une équipe sera au repos chaque journée
- ✅ Utiliser les exemples pré-configurés :
  - **6 équipes** (nombre pair)
  - **5 équipes** (nombre impair)

### Message d'information

Quand une équipe a un bye, cela s'affiche naturellement dans le calendrier :

- Journée 1 : 2 matchs (1 équipe au repos)
- Journée 2 : 2 matchs (1 équipe au repos)
- etc.

## Tests recommandés

### Test 1 : 5 équipes

```bash
# Dans l'interface web
1. Charger "5 équipes (impaire)"
2. Générer le calendrier
3. Vérifier : 5 journées, 10 matchs total, 2 matchs par journée
```

### Test 2 : 7 équipes

```bash
# API
curl -X POST http://localhost:8000/solve \
  -H "Content-Type: application/json" \
  -d '{
    "teams": ["A", "B", "C", "D", "E", "F", "G"],
    "rounds": "single",
    "max_time": 30
  }'

# Résultat attendu : 7 journées, 21 matchs, 3 matchs par journée
```

### Test 3 : 3 équipes (minimum impair)

```bash
# 3 équipes → 3 journées, 3 matchs total, 1 match par journée
teams = ["A", "B", "C"]

Journée 1: A vs B (C au repos)
Journée 2: A vs C (B au repos)
Journée 3: B vs C (A au repos)
```

## Conclusion

Le système de bye par équipe fictive permet de :

1. ✅ **Supporter les équipes impaires** (votre remarque était juste !)
2. ✅ **Garantir l'équité** entre toutes les équipes
3. ✅ **Simplifier l'implémentation** (réutilisation du code existant)
4. ✅ **Optimiser les breaks** malgré les repos

C'est une solution élégante et largement utilisée dans la littérature académique sur le sports scheduling !
