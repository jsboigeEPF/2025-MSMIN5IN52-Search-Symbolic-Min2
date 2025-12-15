# 📋 Nouvelles Fonctionnalités Ajoutées

## 🎯 Résumé des Modifications

### 1. ⚙️ Paramètre "Jours de match par semaine"

**Description :** Permet de contrôler l'espacement des matchs dans le calendrier.

**Interface :**

- Slider de 1 à 7 jours
- Affichage dynamique de la valeur sélectionnée
- Explication : "Permet d'espacer les matchs dans le calendrier"

**Fonctionnement :**

- 1 jour = matchs tous les 7 jours (hebdomadaire classique)
- 2 jours = matchs tous les 3-4 jours (2 matchs/semaine)
- 7 jours = matchs tous les jours (quotidien)

**Fichiers modifiés :**

- `src/api.py` : Ajout du paramètre `match_days_per_week` dans `SolveRequest`
- `frontend/src/App.tsx` :
  - Ajout du state `matchDaysPerWeek`
  - Modification de `scheduleToEvents()` pour calculer `daysPerRound = 7 / matchDaysPerWeek`
  - Envoi du paramètre au backend

---

### 2. 📊 Statistiques d'Équité

**Description :** Nouvelles métriques pour évaluer l'équité du calendrier.

**Nouvelles colonnes dans le tableau :**

#### 🚗 Déplacements

- **Signification :** Nombre total de matchs à l'extérieur
- **Contrainte d'équité :** Toutes les équipes devraient avoir un nombre similaire
- **Affichage :** Badge orange avec icône voiture
- **Utilité :** Mesure la charge de déplacements par équipe

#### 🎯 Adversaires

- **Signification :** Nombre d'adversaires différents affrontés
- **Variété :** Plus le nombre est élevé, plus l'équipe a affronté d'adversaires variés
- **Affichage :** Badge indigo avec icône cible
- **Utilité :** Mesure la diversité des confrontations

**Fichiers modifiés :**

- `src/model.py` : Ajout des calculs dans `get_statistics()`
  - `opponent_variety` : Calcul du nombre d'adversaires uniques via `set()`
  - `total_travel_distance` : Égal au nombre de matchs away
- `src/api.py` : Ajout des champs dans le modèle `Statistics`
- `frontend/src/App.tsx` : Ajout des colonnes dans le tableau

---

### 3. 📅 Détail des Journées par Équipe

**Description :** Vue explicite des journées à domicile, extérieur et repos pour chaque équipe.

**Affichage :**

- **Layout :** Grille responsive (1/2/3 colonnes selon écran)
- **Carte par équipe** contenant :

#### 🏠 Domicile

- Nombre de matchs à domicile
- Liste des journées : "J1, J3, J5..."
- Couleur : Bleu

#### ✈️ Extérieur

- Nombre de matchs à l'extérieur
- Liste des journées : "J2, J4, J6..."
- Couleur : Violet

#### 😴 Repos (Bye)

- Nombre de journées de repos
- Liste des journées : "J7, J9..."
- Couleur : Vert
- **Condition :** Affiché uniquement si l'équipe a au moins 1 bye

**Algorithme :**

```typescript
schedule.forEach((round) => {
  // Pour chaque équipe, vérifier si elle joue ce round
  if (match.home === team) -> homeDays
  else if (match.away === team) -> awayDays
  else -> byeDays (pas de match = repos)
});
```

**Fichiers modifiés :**

- `frontend/src/App.tsx` :
  - Section ajoutée après la légende des statistiques
  - Calcul dynamique basé sur `schedule` et `teams`

---

## 🔧 Détails Techniques

### Backend (Python)

```python
# src/api.py
class SolveRequest(BaseModel):
    match_days_per_week: int = Field(default=1, ge=1, le=7)

class Statistics(BaseModel):
    opponent_variety: dict[str, int]
    total_travel_distance: dict[str, int]
```

```python
# src/model.py - get_statistics()
opponents_faced = set()
for t in range(self.rounds):
    for (a, b) in self.pair_schedule[t]:
        if a == i:
            opponents_faced.add(b)
        elif b == i:
            opponents_faced.add(a)
stats['opponent_variety'][self.teams[i]] = len(opponents_faced)
stats['total_travel_distance'][self.teams[i]] = away_count
```

### Frontend (React + TypeScript)

```typescript
// Calcul de l'intervalle entre rounds
const daysPerRound = Math.floor(7 / matchDaysPerWeek);

// Espacement des matchs
day.setDate(start.getDate() + r * daysPerRound);
```

---

## 📝 Légende Mise à Jour

**Anciennes métriques :**

- Breaks
- Domicile/Extérieur
- Max consécutifs

**Nouvelles métriques :**

- **Déplacements 🚗** : Nombre total de matchs à l'extérieur (contrainte d'équité)
- **Adversaires 🎯** : Nombre d'adversaires différents affrontés (variété)

**Nouveau panneau :**

- **📅 Détail des journées par équipe** : Vue explicite des journées 🏠 Domicile, ✈️ Extérieur, 😴 Repos

---

## ✅ Validation

### Tests recommandés :

1. **Jours de match par semaine :**

   - Tester avec 1 jour → matchs espacés de 7 jours
   - Tester avec 2 jours → matchs espacés de ~3 jours
   - Tester avec 7 jours → matchs quotidiens

2. **Statistiques d'équité :**

   - Vérifier que toutes les équipes ont des valeurs similaires
   - Comparer déplacements vs matchs extérieur (doivent être égaux)
   - Vérifier qu'en tournoi complet, adversaires = n-1

3. **Détail des journées :**
   - Équipes paires : pas de journées de repos
   - Équipes impaires : au moins 1 journée de repos par round
   - Somme domicile + extérieur + repos = nombre total de rounds

---

## 🎨 Améliorations UX

- **Gradients colorés** pour les badges (vert/jaune/rouge selon performance)
- **Icônes explicites** (🚗 déplacements, 🎯 adversaires, 🏠 domicile, ✈️ extérieur, 😴 repos)
- **Responsive design** avec grille adaptative
- **Tooltips implicites** via légende détaillée

---

## 📚 Documentation Associée

- `STATISTIQUES_EQUITE.md` : Détails sur les contraintes d'équité
- `EQUIPES_IMPAIRES.md` : Gestion des équipes impaires et système de bye
- `API_README.md` : Documentation de l'API actualisée

---

**Date :** 12 décembre 2025  
**Version :** 2.0.0
