# 🏆 Sports Tournament Scheduler

Planificateur de tournois sportifs utilisant la programmation par contraintes (OR-Tools CP-SAT).  
Projet MSMIN5IN52 - Recherche symbolique (2025)

## 🎯 Objectif

Générer un calendrier de tournoi round-robin (aller simple ou aller-retour) en optimisant l'alternance domicile/extérieur pour **minimiser les "breaks"** (matchs consécutifs au même endroit).

## ✨ Fonctionnalités

✅ **Programmation par contraintes** avec OR-Tools CP-SAT  
✅ **Support équipes paires ET impaires** (système de bye automatique)  
✅ **Minimisation des breaks** (borne théorique: n-2 pour n équipes)  
✅ **Contraintes d'équité** (max déplacements consécutifs)  
✅ **API REST FastAPI** avec documentation Swagger  
✅ **Interface web moderne** React + TypeScript  
✅ **Visualisation calendrier** avec FullCalendar  
✅ **Export JSON** du calendrier

## 🚀 Installation rapide

### Avec conda (Recommandé)

```bash
# Installation automatique
./setup_conda.sh

# Démarrage de l'API
./start_api.sh
```

### Installation manuelle

```bash
# Activer l'environnement conda
conda activate sender

# Installer les dépendances
pip install -r requirements.txt

# Démarrer l'API
uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
```

## 🌐 Utilisation

### Interface Web (Recommandé)

1. **Démarrer le backend**

```bash
conda activate sender
./start_api.sh
# API disponible sur http://localhost:8000
```

2. **Démarrer le frontend**

```bash
cd frontend
bun install  # Première fois seulement
bun run dev
# Interface disponible sur http://localhost:5173
```

3. **Utiliser l'interface**
   - Ajouter vos équipes (2 minimum, pair ou impair !)
   - Choisir le type de tournoi (simple/double)
   - Configurer le temps de résolution
   - Cliquer sur "Générer le calendrier"
   - Visualiser sur le calendrier ou en liste
   - Exporter en JSON

### CLI (Mode ligne de commande)

Générer un calendrier simple (6 équipes) :

```bash
python -m src.main --teams data/teams_example.json --rounds single --max-time 30
```

Exporter en JSON :

```bash
python -m src.main --teams data/teams_example.json --out schedule.json
```

### API REST

```bash
# Tester l'API
curl http://localhost:8000/health

# Générer un calendrier
curl -X POST http://localhost:8000/solve \
  -H "Content-Type: application/json" \
  -d '{
    "teams": ["PSG", "OM", "Lyon", "Monaco", "Lille"],
    "rounds": "single",
    "max_time": 30
  }'
```

Documentation interactive : http://localhost:8000/docs

## 📊 Contraintes implémentées

### 1. Variables de décision

- `M[(t,a,b)]` : Équipe `a` reçoit équipe `b` au tour `t`
- `home[(t,i)]` : Équipe `i` joue à domicile au tour `t`
- `breaks[(t,i)]` : Équipe `i` a un break au tour `t`

### 2. Contraintes globales

- ✅ **Alternance domicile/extérieur** : Global constraints
- ✅ **Minimisation des breaks** : Fonction objectif
- ✅ **Max déplacements consécutifs** : Fenêtre glissante (défaut: 3)
- ✅ **Round-robin complet** : Chaque équipe rencontre toutes les autres
- ✅ **Équité** : Distribution équilibrée des matchs

### 3. Support équipes impaires

- Système de **"bye"** automatique (équipe au repos)
- Une équipe fictive (-1) pour équilibrer le calendrier
- Chaque équipe a exactement 1 journée de repos

## 🏗️ Structure du projet

```
.
├── src/
│   ├── api.py           # API FastAPI
│   ├── main.py          # CLI
│   ├── model.py         # Modèle CP-SAT
│   ├── solver.py        # Wrapper de résolution
│   ├── generator.py     # Algorithme du cercle (round-robin)
│   └── visualize.py     # Export et affichage
├── frontend/            # Interface React + TypeScript
│   ├── src/
│   │   ├── App.tsx      # Composant principal
│   │   └── components/  # Composants réutilisables
│   └── package.json
├── data/               # Données d'exemple
├── tests/              # Tests unitaires
├── setup_conda.sh      # Script d'installation
├── start_api.sh        # Script de démarrage
└── requirements.txt    # Dépendances Python
```

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Guide de démarrage rapide
- **[GUIDE_UTILISATION.md](GUIDE_UTILISATION.md)** - Guide d'utilisation détaillé
- **[API_README.md](API_README.md)** - Documentation de l'API
- **[FONCTIONNALITES.md](FONCTIONNALITES.md)** - Liste complète des fonctionnalités
- **[EQUIPES_IMPAIRES.md](EQUIPES_IMPAIRES.md)** - Explication du système de bye

## 🧪 Tests

```bash
conda activate sender
pytest tests/
```

## 🎓 Références académiques

### Articles principaux

- **Régin (CP 2008)** - _Minimizing breaks in sports schedules_  
  Modèle CP pour tournoi simple ronde, preuve de la borne minimale (n-2 breaks)

- **Schaerf (1999)** - _Sports scheduling_  
  Revue complète des approches de scheduling sportif

- **ITC 2021** - _Sports Scheduling Track_  
  Compétition internationale utilisant CP et métaheuristiques

### Implémentation

- **OR-Tools CP-SAT** : Google Optimization Tools
- **Circle Method** : Algorithme classique de génération round-robin
- **Global Constraints** : Pour alternance domicile/extérieur

## 🔬 Technologies

### Backend

- **Python 3.11** avec conda
- **OR-Tools** (>= 9.6) - Solveur CP-SAT
- **FastAPI** (>= 0.104) - API REST moderne
- **Uvicorn** - Serveur ASGI
- **Pydantic** - Validation de données

### Frontend

- **React 18** + **TypeScript**
- **Vite** - Build tool rapide
- **Bun** - Runtime JavaScript performant
- **FullCalendar** - Visualisation calendrier
- **Tailwind CSS** - Framework CSS

## 💡 Exemples d'utilisation

### Exemple 1 : 6 équipes (nombre pair)

```python
teams = ["PSG", "OM", "Lyon", "Monaco", "Lille", "Rennes"]
# Résultat : 5 journées, 15 matchs, 3 matchs par journée
# Breaks optimaux : ~ 4 (théorique minimum = 6-2 = 4)
```

### Exemple 2 : 5 équipes (nombre impair)

```python
teams = ["PSG", "OM", "Lyon", "Monaco", "Lille"]
# Résultat : 5 journées, 10 matchs, 2 matchs par journée
# Chaque équipe a 1 journée de repos
# Breaks optimaux : ~ 3 (théorique minimum = 5-2 = 3)
```

### Exemple 3 : Double round-robin

```python
teams = ["PSG", "OM", "Lyon", "Monaco"]
rounds = "double"
# Résultat : 6 journées (aller-retour)
# Phase aller : 3 journées
# Phase retour : 3 journées (domicile/extérieur inversés)
```

## ⚡ Performance

### Temps de résolution typiques

- **6 équipes** : ~5-10 secondes
- **8 équipes** : ~10-20 secondes
- **10 équipes** : ~30-60 secondes
- **12+ équipes** : 60-120 secondes

### Optimisation

- Multi-threading (8 workers par défaut)
- Temps de résolution configurable (5-120s)
- Heuristiques de recherche optimisées

## 🐛 Dépannage

### L'API ne démarre pas

```bash
# Vérifier l'environnement
conda activate sender
pip install -r requirements.txt

# Vérifier le port
lsof -i :8000
```

### Erreur "Connection refused" dans le frontend

1. Vérifier que l'API est démarrée : `curl http://localhost:8000/health`
2. Vérifier les CORS dans `src/api.py`

### Aucune solution trouvée

- Augmenter le temps de résolution
- Pour grandes instances (>20 équipes), le problème devient très difficile


## 📝 Licence

Projet académique - Usage éducatif

---

## 🚀 Quick Start

```bash
# Installation
./setup_conda.sh

# Terminal 1 - Backend
./start_api.sh

# Terminal 2 - Frontend
cd frontend && bun run dev

# Ouvrir http://localhost:5173 dans le navigateur
```

Bon scheduling ! 🏆⚽
