# 🐳 Déploiement Docker

Ce projet utilise Docker Compose pour orchestrer le backend (FastAPI) et le frontend (React + Vite).

## 📋 Prérequis

- Docker (version 20.10 ou supérieure)
- Docker Compose (version 2.0 ou supérieure)

## 🚀 Démarrage rapide

### Option 1 : Script automatique

```bash
./start_docker.sh
```

### Option 2 : Commandes manuelles

```bash
# Construire les images
docker-compose build

# Démarrer les services
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

## 🌐 Accès aux services

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs
- **Health Check** : http://localhost:8000/health

## 📦 Services

### Backend (Python/FastAPI)

- Port : `8000`
- Framework : FastAPI + OR-Tools
- Hot reload activé

### Frontend (React/Vite)

- Port : `5173`
- Build tool : Bun + Vite
- Hot reload activé

## 🔧 Commandes utiles

```bash
# Voir les logs en temps réel
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend

# Redémarrer un service
docker-compose restart backend
docker-compose restart frontend

# Arrêter les services
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v

# Reconstruire les images
docker-compose build --no-cache

# Accéder au shell d'un conteneur
docker-compose exec backend bash
docker-compose exec frontend sh
```

## 🐛 Dépannage

### Le frontend ne se connecte pas au backend

Vérifiez que `VITE_BACKEND_URL` est correctement configuré dans `docker-compose.yml`

### Erreur de port déjà utilisé

```bash
# Vérifier quel processus utilise le port
sudo lsof -i :8000
sudo lsof -i :5173

# Arrêter les processus existants
docker-compose down
```

### Reconstruire complètement

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 📝 Structure

```
.
├── docker-compose.yml        # Orchestration des services
├── Dockerfile.backend        # Image Docker pour le backend
├── frontend/
│   └── Dockerfile           # Image Docker pour le frontend
└── start_docker.sh          # Script de démarrage rapide
```

## 🔐 Variables d'environnement

Modifiez `docker-compose.yml` pour personnaliser :

```yaml
backend:
  environment:
    - PYTHONUNBUFFERED=1

frontend:
  environment:
    - VITE_BACKEND_URL=http://localhost:8000
```

## 🎯 Mode production

Pour un déploiement en production, modifiez :

1. Désactivez le mode `--reload` dans le backend
2. Utilisez `bun run build` pour le frontend
3. Ajoutez un serveur web (nginx) pour servir le build statique
4. Configurez les variables d'environnement de production
