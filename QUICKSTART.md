# 🏆 Sports Tournament Scheduler - Guide de démarrage rapide

Planificateur de tournois sportifs utilisant la programmation par contraintes (CP-SAT) pour optimiser les calendriers.

## 📋 Prérequis

- **Conda** (Miniconda ou Anaconda)
- **Python 3.11** (installé automatiquement avec conda)

## 🚀 Installation et démarrage rapide

### Option 1 : Scripts automatiques (Recommandé)

```bash
# 1. Installation de l'environnement conda
./setup_conda.sh

# 2. Démarrage de l'API
./start_api.sh
```

### Option 2 : Commandes manuelles

```bash
# 1. Activer l'environnement conda 'sender'
conda activate sender

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Démarrer l'API
uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
```

## 🌐 Accès à l'API

Une fois l'API démarrée :

- **API principale** : http://localhost:8000
- **Documentation interactive (Swagger)** : http://localhost:8000/docs
- **Documentation alternative (ReDoc)** : http://localhost:8000/redoc

## 🧪 Test rapide

### Via le navigateur

Ouvrez http://localhost:8000/docs et testez directement l'endpoint `/solve`

### Via curl

```bash
curl -X POST http://localhost:8000/solve \
  -H "Content-Type: application/json" \
  -d '{
    "teams": ["PSG", "OM", "Lyon", "Monaco", "Lille", "Rennes"],
    "rounds": "single",
    "max_time": 30
  }'
```

### Via Python

```python
import requests

response = requests.post('http://localhost:8000/solve', json={
    "teams": ["PSG", "OM", "Lyon", "Monaco", "Lille", "Rennes"],
    "rounds": "single",
    "max_time": 30
})

print(response.json())
```

## 📁 Structure du projet

```
.
├── src/
│   ├── api.py           # API FastAPI (nouvelle)
│   ├── main.py          # CLI original
│   ├── solver.py        # Logique de résolution
│   ├── model.py         # Modèle CP-SAT
│   ├── generator.py     # Générateur de paires
│   └── visualize.py     # Visualisation et export
├── frontend/            # Application React (frontend)
├── data/               # Fichiers de données d'exemple
├── tests/              # Tests unitaires
├── setup_conda.sh      # Script d'installation
├── start_api.sh        # Script de démarrage
├── requirements.txt    # Dépendances Python
└── API_README.md       # Documentation détaillée de l'API
```

## 🎯 Fonctionnalités

### Optimisation par contraintes (CP-SAT)

- ✅ Minimisation des "breaks" (matchs consécutifs à domicile/extérieur)
- ✅ Alternance domicile/extérieur
- ✅ Contraintes d'équité entre équipes
- ✅ Limite de déplacements consécutifs

### API RESTful

- ✅ Support CORS pour intégration frontend
- ✅ Validation automatique des données (Pydantic)
- ✅ Documentation interactive (Swagger/ReDoc)
- ✅ Export JSON du calendrier

### Modes de tournoi

- **Simple** : Chaque équipe rencontre les autres une fois
- **Double** : Tournoi aller-retour complet

## 📚 Documentation complète

Pour plus de détails sur l'utilisation de l'API, consultez [API_README.md](./API_README.md)

## 🔧 Développement

### Mode CLI (usage original)

```bash
conda activate sender
python -m src.main --teams data/teams_example.json --rounds single --max-time 30
```

### Tests

```bash
conda activate sender
pytest tests/
```

### Frontend

```bash
cd frontend
bun install
bun run dev
```

## 🐛 Dépannage

### L'environnement conda n'existe pas

```bash
conda create -n sender python=3.11 -y
conda activate sender
pip install -r requirements.txt
```

### Port 8000 déjà utilisé

```bash
# Utiliser un autre port
uvicorn src.api:app --reload --port 8001
```

### Problèmes d'importation

```bash
# Réinstaller les dépendances
conda activate sender
pip install -r requirements.txt --force-reinstall
```

## 📖 Références académiques

- **Régin (CP 2008)** - Minimizing breaks in sports schedules
- **Schaerf (1999)** - Sports scheduling review
- **ITC 2021** - Sports Scheduling Track

## 👥 Auteurs

Projet MSMIN5IN52 - Recherche symbolique (2025)

## 📝 Licence

Projet académique - Polytech Nice Sophia
