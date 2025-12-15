# API du Planificateur de Tournois Sportifs

## 🚀 Démarrage rapide avec Conda (Recommandé)

### Installation complète

```bash
# 1. Exécuter le script d'installation (crée l'environnement 'sender' si nécessaire)
./setup_conda.sh

# 2. Démarrer l'API
./start_api.sh
```

### Installation manuelle avec Conda

```bash
# 1. Activer l'environnement conda 'sender'
conda activate sender

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Lancer l'API
uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
```

### Installation alternative (sans Conda)

```bash
pip install -r requirements.txt
uvicorn src.api:app --reload
```

L'API sera accessible sur `http://localhost:8000`

### Documentation interactive

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📡 Endpoints

### `GET /`

Point d'entrée de l'API avec la liste des endpoints disponibles.

### `GET /health`

Vérification de l'état de l'API.

### `POST /solve`

Génère un calendrier de tournoi optimisé.

**Body (JSON):**

```json
{
  "teams": ["PSG", "OM", "Lyon", "Monaco", "Lille", "Rennes"],
  "rounds": "single",
  "max_time": 30
}
```

**Paramètres:**

- `teams` (array): Liste des noms des équipes (minimum 2)
- `rounds` (string): `"single"` pour aller simple, `"double"` pour aller-retour
- `max_time` (int): Temps maximum de résolution en secondes (1-300)

**Réponse:**

```json
{
  "success": true,
  "objective": 4,
  "total_rounds": 5,
  "rounds": [
    {
      "round_number": 1,
      "matches": [
        { "home": "PSG", "away": "OM" },
        { "home": "Lyon", "away": "Monaco" }
      ]
    }
  ],
  "message": "Calendrier généré avec succès. Nombre de breaks: 4"
}
```

### `POST /solve/export`

Génère un calendrier et le retourne dans un format JSON prêt à l'export.

## 🧪 Tests avec curl

### Test de santé

```bash
curl http://localhost:8000/health
```

### Générer un calendrier

```bash
curl -X POST http://localhost:8000/solve \
  -H "Content-Type: application/json" \
  -d '{
    "teams": ["PSG", "OM", "Lyon", "Monaco", "Lille", "Rennes"],
    "rounds": "single",
    "max_time": 30
  }'
```

## 🌐 CORS

L'API est configurée pour accepter les requêtes depuis :

- `http://localhost:5173` (Vite dev server)
- `http://127.0.0.1:5173`
- `http://localhost:3000` (React dev server)
- `http://127.0.0.1:3000`

Pour ajouter d'autres origines, modifiez la liste `origins` dans `src/api.py`.

## 📝 Utilisation avec le frontend

### Exemple avec fetch (JavaScript)

```javascript
async function solveTournament(teams) {
  const response = await fetch("http://localhost:8000/solve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      teams: teams,
      rounds: "single",
      max_time: 30,
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("Calendrier généré!");
    console.log("Nombre de breaks:", data.objective);
    console.log("Rounds:", data.rounds);
  } else {
    console.error("Erreur:", data.message);
  }
}
```

### Exemple avec axios (JavaScript)

```javascript
import axios from "axios";

async function solveTournament(teams) {
  try {
    const response = await axios.post("http://localhost:8000/solve", {
      teams: teams,
      rounds: "single",
      max_time: 30,
    });

    if (response.data.success) {
      console.log("Calendrier:", response.data.rounds);
    }
  } catch (error) {
    console.error("Erreur:", error.response?.data?.detail);
  }
}
```

## 🔧 Mode CLI (ancien usage)

Le mode CLI est toujours disponible via `src/main.py`:

```bash
python -m src.main --teams data/teams_example.json --rounds single --max-time 30 --out output.json
```

## 🏗️ Architecture

- **FastAPI**: Framework web moderne et rapide
- **OR-Tools CP-SAT**: Solveur de contraintes pour l'optimisation
- **Pydantic**: Validation des données
- **CORS**: Support multi-origine pour les applications frontend

## 📊 Optimisation

Le solveur minimise le nombre de "breaks" (deux matchs consécutifs à domicile ou à l'extérieur pour une même équipe) tout en respectant les contraintes suivantes :

- Alternance domicile/extérieur
- Chaque équipe rencontre toutes les autres équipes
- Pas plus de 3 déplacements consécutifs (configurable)
