# 📅 Logique des Jours de Match par Semaine

## 🎯 Architecture Backend + Frontend

### ✅ Implémentation Correcte

La logique des jours de match par semaine est maintenant **répartie intelligemment** entre backend et frontend :

---

## 🔧 Backend (Python)

### Rôle : Calcul et Métadonnées

Le backend génère le calendrier round-robin et **calcule les métadonnées** pour chaque round :

#### Fichier : `src/api.py`

```python
# Pour chaque round, calculer :
week_number = ((round_num - 1) // match_days) + 1
day_index = (round_num - 1) % match_days

# Mapper sur jours de la semaine (0=lundi, 6=dimanche)
if match_days == 1:
    day_of_week = 0  # Lundi uniquement
elif match_days == 2:
    day_of_week = [0, 3][day_index]  # Lundi, Jeudi
elif match_days == 3:
    day_of_week = [0, 2, 4][day_index]  # Lundi, Mercredi, Vendredi
elif match_days == 4:
    day_of_week = [0, 2, 4, 6][day_index]  # L, M, V, D
else:
    day_of_week = day_index  # 5-7 jours : distribution uniforme
```

#### Exemple : 6 équipes, 2 jours/semaine

| Round | Week | Day | Jour réel       |
| ----- | ---- | --- | --------------- |
| 1     | 1    | 0   | Lundi semaine 1 |
| 2     | 1    | 3   | Jeudi semaine 1 |
| 3     | 2    | 0   | Lundi semaine 2 |
| 4     | 2    | 3   | Jeudi semaine 2 |
| 5     | 3    | 0   | Lundi semaine 3 |

#### Retour API

```json
{
  "rounds": [
    {
      "round_number": 1,
      "week_number": 1,
      "day_of_week": 0,
      "matches": [{"home": "PSG", "away": "OM"}, ...]
    },
    {
      "round_number": 2,
      "week_number": 1,
      "day_of_week": 3,
      "matches": [...]
    }
  ]
}
```

---

## 🎨 Frontend (React)

### Rôle : Affichage sur le Calendrier

Le frontend utilise les métadonnées du backend pour positionner les événements :

#### Fichier : `frontend/src/App.tsx`

```typescript
function scheduleToEvents(
  schedule: Round[],
  matchDaysPerWeek: number,
  startDate?: string
) {
  // Utiliser les métadonnées du backend
  if (round.week_number !== undefined && round.day_of_week !== undefined) {
    targetDate = new Date(start);
    targetDate.setDate(
      start.getDate() +
        (round.week_number - 1) * 7 + // Décalage par semaine
        round.day_of_week // Jour dans la semaine
    );
  }
}
```

#### Exemple de calcul

```
startDate = Lundi 16 décembre 2024

Round 1 (week=1, day=0):
  Date = 16 déc + (1-1)*7 + 0 = 16 déc (Lundi)

Round 2 (week=1, day=3):
  Date = 16 déc + (1-1)*7 + 3 = 19 déc (Jeudi)

Round 3 (week=2, day=0):
  Date = 16 déc + (2-1)*7 + 0 = 23 déc (Lundi)
```

---

## 📊 Distribution des Jours selon `match_days_per_week`

| Param | Jours utilisés                      | Distribution           |
| ----- | ----------------------------------- | ---------------------- |
| **1** | Lundi                               | Hebdomadaire classique |
| **2** | Lundi, Jeudi                        | Mi-semaine             |
| **3** | Lundi, Mercredi, Vendredi           | Réparti                |
| **4** | Lundi, Mercredi, Vendredi, Dimanche | Weekend inclus         |
| **5** | Lun-Ven                             | Semaine complète       |
| **6** | Lun-Sam                             | Quasi-quotidien        |
| **7** | Lun-Dim                             | Quotidien              |

---

## 🔄 Flux de Données

```
1. USER sélectionne "2 jours/semaine"
   ↓
2. FRONTEND envoie match_days_per_week=2 au backend
   ↓
3. BACKEND génère 5 rounds (6 équipes)
   ↓
4. BACKEND calcule pour chaque round :
   - week_number (1, 1, 2, 2, 3)
   - day_of_week (0, 3, 0, 3, 0) = (Lun, Jeu, Lun, Jeu, Lun)
   ↓
5. BACKEND retourne JSON avec métadonnées
   ↓
6. FRONTEND lit week_number et day_of_week
   ↓
7. FRONTEND positionne événements sur calendrier
   ↓
8. CALENDRIER affiche :
   - Semaine 1 : Lundi (Round 1), Jeudi (Round 2)
   - Semaine 2 : Lundi (Round 3), Jeudi (Round 4)
   - Semaine 3 : Lundi (Round 5)
```

---

## ✅ Avantages de cette Architecture

### Backend

- ✅ **Logique métier centralisée** : Le backend décide de la distribution
- ✅ **Cohérence** : Même calcul pour tous les clients
- ✅ **Validation** : Peut vérifier contraintes (ex: pas de matchs le dimanche)
- ✅ **Évolutivité** : Facile d'ajouter des règles (ex: blacklist de jours)

### Frontend

- ✅ **Simplicité** : Juste lire et afficher les métadonnées
- ✅ **Performance** : Pas de calcul complexe côté client
- ✅ **Fiabilité** : Pas de divergence entre calculs frontend/backend
- ✅ **Flexibilité** : Peut afficher différemment sans changer le backend

---

## 🧪 Tests de Validation

### Test 1 : 1 jour/semaine (classique)

```python
teams = 6
match_days = 1
Expected: Tous les rounds le lundi
```

### Test 2 : 2 jours/semaine

```python
teams = 6
match_days = 2
Expected: Alternance Lundi/Jeudi
Week 1: Round 1 (Lun), Round 2 (Jeu)
Week 2: Round 3 (Lun), Round 4 (Jeu)
Week 3: Round 5 (Lun)
```

### Test 3 : 7 jours/semaine

```python
teams = 6
match_days = 7
Expected: 1 round par jour
Week 1: Lun, Mar, Mer, Jeu, Ven, Sam, Dim (si 7+ rounds)
```

### Test 4 : Équipes impaires + 2 jours/semaine

```python
teams = 5
match_days = 2
Expected: 5 rounds (1 bye par round), Lundi/Jeudi
```

---

## 🔍 Debugging

### Vérifier côté Backend

```bash
curl -X POST http://localhost:8000/solve \
  -H "Content-Type: application/json" \
  -d '{
    "teams": ["A", "B", "C", "D"],
    "rounds": "single",
    "match_days_per_week": 2
  }' | jq '.rounds[] | {round_number, week_number, day_of_week}'
```

### Vérifier côté Frontend

```javascript
console.log(
  "Events:",
  events.map((e) => ({
    round: e.extendedProps.round,
    week: e.extendedProps.week,
    start: e.start,
  }))
);
```

---

## 📝 Notes Importantes

1. **`week_number` commence à 1** (pas 0)
2. **`day_of_week` suit convention** : 0=Lundi, 6=Dimanche
3. **Rounds générés indépendamment** du paramètre (round-robin standard)
4. **Seule la distribution change**, pas le nombre de rounds
5. **Byes gérés séparément** (équipes impaires)

---

## 🎓 Exemple Complet

### Configuration

- **6 équipes** : PSG, OM, Lyon, Monaco, Lille, Rennes
- **Single round-robin** : 5 rounds
- **2 jours/semaine** : Lundi et Jeudi

### Résultat Backend

```json
[
  {"round_number": 1, "week_number": 1, "day_of_week": 0, "matches": [...]},
  {"round_number": 2, "week_number": 1, "day_of_week": 3, "matches": [...]},
  {"round_number": 3, "week_number": 2, "day_of_week": 0, "matches": [...]},
  {"round_number": 4, "week_number": 2, "day_of_week": 3, "matches": [...]},
  {"round_number": 5, "week_number": 3, "day_of_week": 0, "matches": [...]}
]
```

### Affichage Calendrier

```
Semaine 1:
  Lundi 16/12   : Round 1 - PSG vs OM, Lyon vs Monaco, Lille vs Rennes
  Jeudi 19/12   : Round 2 - PSG vs Lyon, OM vs Lille, Monaco vs Rennes

Semaine 2:
  Lundi 23/12   : Round 3 - PSG vs Monaco, OM vs Rennes, Lyon vs Lille
  Jeudi 26/12   : Round 4 - PSG vs Lille, OM vs Monaco, Lyon vs Rennes

Semaine 3:
  Lundi 30/12   : Round 5 - PSG vs Rennes, OM vs Lyon, Monaco vs Lille
```

---

**Conclusion** : La logique est maintenant **correctement distribuée** :

- 🐍 **Backend** = Calcul + Métadonnées
- ⚛️ **Frontend** = Affichage + UX
