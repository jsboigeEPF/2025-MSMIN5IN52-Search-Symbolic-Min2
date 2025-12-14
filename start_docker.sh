#!/bin/bash

echo "🚀 Démarrage du Tournament Scheduler avec Docker Compose..."
echo ""

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker d'abord."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose d'abord."
    exit 1
fi

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose down

# Construire et démarrer les conteneurs
echo "🔨 Construction des images Docker..."
docker-compose build

echo "▶️  Démarrage des services..."
docker-compose up -d

echo ""
echo "✅ Services démarrés avec succès !"
echo ""
echo "📊 Backend API:  http://localhost:8000"
echo "🌐 Frontend:     http://localhost:5173"
echo "📖 API Docs:     http://localhost:8000/docs"
echo ""
echo "📝 Logs en temps réel:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Pour arrêter les services:"
echo "   docker-compose down"
echo ""
