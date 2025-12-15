#!/bin/bash

# Script d'installation et de configuration de l'environnement conda
# Usage: ./setup_conda.sh

echo "🔧 Configuration de l'environnement conda pour le projet..."
echo ""

# Activer conda
eval "$(conda shell.bash hook)"

# Vérifier si l'environnement 'sender' existe
if conda env list | grep -q "^sender "; then
    echo "✅ L'environnement 'sender' existe déjà"
    echo "Activation de l'environnement..."
    conda activate sender
else
    echo "📦 Création de l'environnement conda 'sender' avec Python 3.11..."
    conda create -n sender python=3.11 -y
    conda activate sender
fi

# Installer les dépendances
echo ""
echo "📥 Installation des dépendances Python..."
pip install -r requirements.txt

echo ""
echo "✅ Installation terminée!"
echo ""
echo "Pour démarrer l'API, exécutez:"
echo "  ./start_api.sh"
echo ""
echo "Ou manuellement:"
echo "  conda activate sender"
echo "  uvicorn src.api:app --reload"
