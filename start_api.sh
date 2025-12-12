#!/bin/bash

# Script pour démarrer l'API du planificateur de tournois sportifs
# Usage: ./start_api.sh

echo "🚀 Démarrage de l'API Sports Tournament Scheduler..."
echo ""

# Activer l'environnement conda sender
eval "$(conda shell.bash hook)"
conda activate sender

# Vérifier que l'environnement est activé
if [[ $CONDA_DEFAULT_ENV != "sender" ]]; then
    echo "❌ Erreur: impossible d'activer l'environnement conda 'sender'"
    exit 1
fi

echo "✅ Environnement conda 'sender' activé"
echo ""

# Se déplacer dans le répertoire du projet
cd "$(dirname "$0")"

# Démarrer l'API avec uvicorn
echo "🌐 Démarrage de l'API sur http://localhost:8000"
echo "📚 Documentation: http://localhost:8000/docs"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""

uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
