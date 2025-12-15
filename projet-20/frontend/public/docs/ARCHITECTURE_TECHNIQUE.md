# 🏗️ Architecture Technique

Guide complet du fonctionnement technique du Sports Tournament Scheduler.

## 📐 Vue d'ensemble

```
┌─────────────────┐
│   Frontend      │
│  React + Vite   │
│  (Port 5173)    │
└────────┬────────┘
         │ HTTP/JSON
         ↓
┌─────────────────┐
│   Backend API   │
│    FastAPI      │
│  (Port 8000)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Solver CP-SAT  │
│   OR-Tools      │
└─────────────────┘
```

---

## 🔧 Backend - Architecture

### **1. API Layer (`src/api.py`)**

**Responsabilité :** Interface REST entre frontend et solveur

#### Endpoints principaux :

- `POST /solve` : Génération de calendrier
- `GET /health` : Health check
- `GET /docs` : Documentation Swagger auto-générée

#### Flux d'une requête `/solve` :

```python
1. Requête HTTP POST
   ↓
2. Validation Pydantic (SolveRequest)
   - teams: List[str] (min 2)
   - rounds: "single" | "double"
   - max_time: int (1-300s)
   - match_days_per_week: int (1-7)
   ↓
3. Appel solver.run(teams, rounds, max_time, match_days)
   ↓
4. Réception (schedule, objective, statistics)
   ↓
5. Calcul métadonnées calendrier
   - week_number = ((round_num - 1) // match_days) + 1
   - day_of_week = mapping selon match_days_per_week
   ↓
6. Formatage réponse JSON (SolveResponse)
   ↓
7. Retour au frontend
```

#### Calcul intelligent des jours de match :

```python
# Exemple : 2 jours/semaine → Lundi (0) et Jeudi (3)
if match_days == 1:
    day_of_week = 0  # Lundi uniquement
elif match_days == 2:
    day_of_week = [0, 3][day_index]  # Lundi, Jeudi
elif match_days == 3:
    day_of_week = [0, 2, 4][day_index]  # Lun, Mer, Ven
```

**Pourquoi ?** Évite de jouer 7 jours consécutifs, répartit intelligemment sur la semaine.

---

### **2. Solver Layer (`src/solver.py`)**

**Responsabilité :** Orchestration de la génération de calendrier

```python
def run(teams, rounds, max_time, match_days_per_week):
    """
    1. Génération des paires (circle method)
    2. Création du modèle CP-SAT
    3. Résolution avec timeout
    4. Extraction statistiques
    5. Retour (schedule, objective, stats)
    """
```

#### Algorithme du Cercle (Circle Method)

**Pour n équipes paires :**
```
Tour 1:  1-6  2-5  3-4
Tour 2:  1-5  6-4  2-3
Tour 3:  1-4  5-3  6-2
...

Principe : Fixer équipe 1, rotation horaire des autres
```

**Pour n équipes impaires :**
```
Ajout d'une équipe fictive (-1)
Équipe face à -1 = BYE (repos)
```

---

### **3. Model Layer (`src/model.py`)**

**Responsabilité :** Modèle de programmation par contraintes (CP-SAT)

#### Variables de décision :

```python
# Pour chaque tour t, chaque paire (a,b) dans pair_schedule
M[(t, a, b)] : bool  # 1 si a reçoit b au tour t

# Pour chaque tour t, chaque équipe i
home[(t, i)] : bool  # 1 si équipe i joue à domicile au tour t

# Pour chaque transition t→t+1, chaque équipe i
breaks[(t, i)] : bool  # 1 si break (même statut D-D ou E-E)
```

#### Contraintes implémentées :

**1. Liaison M ↔ home**
```python
# Si M[(t, a, b)] = 1 (a reçoit b)
# Alors home[(t, a)] = 1 (a à domicile)
# Alors home[(t, b)] = 0 (b à l'extérieur)
```

**2. Calcul des breaks**
```python
# Break si équipe joue 2 fois de suite au même endroit
# Condition : home[t] == home[t-1] ET équipe joue aux 2 tours

for t in range(1, rounds):
    for i in range(n):
        # Vérifier si joue aux tours t et t-1
        # Si oui, break = (home[t] == home[t-1])
```

**Exemple :**
```
Tour 1: PSG à domicile (home=1)
Tour 2: PSG à domicile (home=1)  → Break ✅
Tour 3: PSG à l'extérieur (home=0) → Pas de break
Tour 4: PSG à l'extérieur (home=0) → Break ✅
```

**3. Max déplacements consécutifs**
```python
# Fenêtre glissante : max 3 matchs extérieur consécutifs
for t0 in range(0, rounds - max_away + 1):
    window = [1 - home[(t, i)] for t in range(t0, t0 + max_away)]
    model.Add(sum(window) <= max_away)
```

**4. Contrainte d'équité (DÉSACTIVÉE)**
```python
# PROBLÈME : Cause UNSAT (conflits avec autres contraintes)
# TODO : Implémenter comme contrainte souple dans l'objectif
pass
```

#### Fonction objectif :

```python
model.Minimize(sum(breaks.values()))
```

**Objectif :** Minimiser le nombre total de breaks

**Borne théorique :** Pour n équipes en simple round-robin, minimum = **n-2 breaks**

---

### **4. Statistiques (`src/model.py` - get_statistics)**

Après résolution, calcul des métriques :

```python
def get_statistics(solver):
    for each team:
        # Compter breaks
        team_breaks = sum(solver.Value(breaks[(t,i)]))
        
        # Balance domicile/extérieur
        home_count = sum(solver.Value(home[(t,i)]) for t where team plays)
        away_count = total_matches - home_count
        
        # Séquences consécutives (max streak)
        for t in rounds:
            if team plays:
                if home: current_home += 1
                else: current_away += 1
                update max_streak
        
        # Variété adversaires
        opponents = {all opponents faced in schedule}
        variety = len(opponents)
```

---

## 🎨 Frontend - Architecture

### **Structure des composants**

```
App.tsx (Root)
├── Header (logo, dark mode toggle)
├── Navigation Tabs
│   ├── Configuration
│   ├── Calendrier
│   ├── Statistiques
│   ├── Détails
│   └── Documentation
└── Content (tab-based)
    ├── ConfigTab (form, team list, solve button)
    ├── CalendarTab (FullCalendar)
    ├── StatisticsTab (cards + table)
    ├── DetailsTab (RoundList component)
    └── DocsTab (Documentation component)
```

### **Composants clés**

#### **1. App.tsx**

**État global :**
```typescript
const [darkMode, setDarkMode] = useState(true)
const [activeTab, setActiveTab] = useState<Tab>('config')
const [teams, setTeams] = useState<string[]>([])
const [schedule, setSchedule] = useState<Round[]>([])
const [statistics, setStatistics] = useState<Statistics | null>(null)
```

**Flux de génération :**
```typescript
const solve = async () => {
    // 1. Validation
    if (teams.length < 2) return error
    
    // 2. Requête API
    const response = await fetch('/solve', {
        method: 'POST',
        body: JSON.stringify({
            teams, rounds, max_time, match_days_per_week
        })
    })
    
    // 3. Traitement réponse
    const data = await response.json()
    if (data.success) {
        setSchedule(data.rounds)
        setStatistics(data.statistics)
        setActiveTab('calendar')  // Auto-switch
    }
}
```

#### **2. FullCalendar Integration**

**Transformation schedule → events :**
```typescript
function scheduleToEvents(schedule, startDate) {
    return schedule.flatMap(round => {
        // Calculer date du round
        const targetDate = new Date(startDate)
        targetDate.setDate(
            startDate.getDate() + 
            (round.week_number - 1) * 7 + 
            round.day_of_week
        )
        
        // Créer événements pour chaque match
        return round.matches.map(match => ({
            title: `${match.home} vs ${match.away}`,
            start: targetDate.toISOString().split('T')[0],
            backgroundColor: '#3b82f6'
        }))
    })
}
```

#### **3. RoundList Component**

**Affichage journées :**
```tsx
{schedule.map(round => (
    <div key={round.round_number}>
        <header>Journée {round.round_number}</header>
        <ul>
            {round.matches.map(match => (
                <li>
                    {match.home} vs {match.away}
                </li>
            ))}
        </ul>
    </div>
))}
```

#### **4. Documentation Component**

**Chargement dynamique de markdown :**
```typescript
const loadDocument = async (doc) => {
    const response = await fetch(doc.path)  // /docs/README.md
    const text = await response.text()
    setContent(text)
}

// Rendu avec ReactMarkdown + highlight.js
<ReactMarkdown 
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw, rehypeHighlight]}
>
    {content}
</ReactMarkdown>
```

---

## 🐳 Docker - Architecture

### **docker-compose.yml**

```yaml
services:
  backend:
    build: ./Dockerfile.backend
    ports: ["8000:8000"]
    environment:
      - PYTHONUNBUFFERED=1
    volumes:
      - ./src:/app/src  # Hot reload
    
  frontend:
    build: ./frontend/Dockerfile
    ports: ["5173:5173"]
    depends_on: [backend]
    environment:
      - VITE_BACKEND_URL=http://localhost:8000
```

### **Workflow Docker**

```bash
# Build & Start
docker compose up --build

# Backend démarre sur :8000
# Frontend démarre sur :5173
# Frontend peut appeler backend via http://localhost:8000 (CORS activé)
```

---

## 📊 Flux de données complet

### **Exemple : Génération calendrier 6 équipes**

```
1. FRONTEND - Utilisateur clique "Générer"
   Input: {teams: ["PSG","OM",...], rounds: "single", max_time: 30}
   
2. API - POST /solve
   Validation ✅
   
3. SOLVER - run()
   Génération paires (circle method)
   → [(0,1), (2,3), (4,5)]  # Round 1
   → [(0,2), (3,4), (5,1)]  # Round 2
   → ...
   
4. MODEL - CP-SAT
   Variables: M[(t,a,b)], home[(t,i)], breaks[(t,i)]
   Contraintes: liaison M↔home, max_away, breaks
   Objectif: Minimize(breaks)
   
5. SOLVER - Résolution
   Status: OPTIMAL
   Objective: 4 breaks
   Time: 2.3s
   
6. MODEL - get_statistics()
   Calcul breaks_per_team, home_away_balance, etc.
   
7. API - Formatage
   Calcul week_number, day_of_week
   → Round 1: week=1, day=0 (Lundi)
   → Round 2: week=1, day=3 (Jeudi)
   
8. FRONTEND - Réception
   setSchedule(data.rounds)
   setStatistics(data.statistics)
   
9. FRONTEND - Affichage
   FullCalendar: Événements sur grille calendrier
   StatisticsTab: Tableau avec métriques
   DetailsTab: Liste journées + matchs
```

---

## 🧪 Technologies utilisées

### **Backend**
- **Python 3.11** - Langage
- **FastAPI** - Framework web REST
- **OR-Tools (CP-SAT)** - Solveur de contraintes Google
- **Pydantic** - Validation de données
- **Uvicorn** - Serveur ASGI

### **Frontend**
- **React 18** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool
- **Bun** - Runtime JavaScript rapide
- **FullCalendar** - Visualisation calendrier
- **Tailwind CSS** - Framework CSS
- **ReactMarkdown** - Rendu markdown
- **highlight.js** - Coloration syntaxique code

### **Infrastructure**
- **Docker** - Conteneurisation
- **Docker Compose** - Orchestration multi-services

---

## 🔍 Points techniques importants

### **1. Pourquoi CP-SAT et pas un algo heuristique ?**

✅ **Avantages CP-SAT :**
- Garantit l'optimalité (ou borne)
- Gère facilement contraintes complexes
- Prouve impossibilité si UNSAT
- Recherche exhaustive avec élagage intelligent

❌ **Limites :**
- Temps exponentiel pour grandes instances (>20 équipes)
- Peut échouer sur contraintes trop strictes (UNSAT)

### **2. Gestion des équipes impaires**

```python
if len(teams) % 2 == 1:
    teams.append(-1)  # Équipe fictive
    
# Dans le calendrier généré :
if team == -1 or opponent == -1:
    # Équipe a un BYE (pas de match ce round)
```

### **3. Contrainte d'équité désactivée - Pourquoi ?**

**Problème :** La contrainte stricte `home_count ∈ [target-1, target+1]` crée des conflits avec :
- Contrainte de breaks (alternance)
- Contrainte max_away (fenêtre glissante)
- Structure du round-robin

**Résultat :** UNSAT immédiat (1-2s au lieu de 65s timeout)

**Solution future :** Contrainte souple (soft constraint) dans l'objectif :
```python
objective = sum(breaks) + λ * sum(abs(home_count - target))
```

### **4. Calcul des breaks avec byes**

**Choix de design :** Un break compte même avec un bye entre deux matchs

```
Tour 1: DOMICILE
Tour 2: BYE
Tour 3: DOMICILE  ← Compté comme break
```

**Justification :** L'équipe "reprend" au même endroit, similaire à une continuité.

**Alternative possible :** Ne compter que les matchs strictement consécutifs (sans bye).

---

## 📈 Performance

### **Temps de résolution typiques**

| Équipes | Rounds | Temps | Breaks typiques |
|---------|--------|-------|-----------------|
| 4       | 3      | <1s   | 2               |
| 6       | 5      | 2-5s  | 4               |
| 8       | 7      | 5-15s | 6               |
| 10      | 9      | 10-30s| 8               |
| 20      | 19     | 60s+  | 18              |

**Facteurs d'influence :**
- Nombre d'équipes (exponentiel)
- Type de tournoi (double = 2x plus long)
- Contraintes actives (plus = plus dur)

---

## 🚀 Améliorations possibles

1. **Contrainte d'équité souple** (weighted objective)
2. **Contraintes de stades** (disponibilités, capacités)
3. **Optimisation multi-objectif** (Pareto front)
4. **Heuristiques de démarrage** (warm start CP-SAT)
5. **Mode "fast solve"** avec contraintes relâchées
6. **Support tournois multi-divisions**
7. **Persistance Redis** pour calendriers générés
8. **Webhooks** pour notifications fin de résolution

---

**Auteurs :** Louis Savignac, Fantin Ellna, Hugo Bordier  
**Projet :** MSMIN5IN52 - Recherche symbolique (2025)
