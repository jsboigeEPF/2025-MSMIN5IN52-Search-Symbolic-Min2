# 🏆 Guide d'utilisation - Sports Tournament Scheduler

## 🚀 Démarrage rapide

### Backend (API)

1. **Activer l'environnement conda**

```bash
conda activate sender
```

2. **Démarrer l'API**

```bash
# Option 1: Script automatique
./start_api.sh

# Option 2: Commande manuelle
uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
```

L'API sera accessible sur http://localhost:8000

- Documentation: http://localhost:8000/docs

### Frontend (Interface Web)

1. **Naviguer vers le dossier frontend**

```bash
cd frontend
```

2. **Installer les dépendances** (première fois seulement)

```bash
bun install
```

3. **Démarrer le serveur de développement**

```bash
bun run dev
```

L'interface sera accessible sur http://localhost:5173

## 📖 Utilisation de l'interface

### 1. Configuration des équipes

- **Ajouter des équipes**: Utilisez le champ "Nom de l'équipe" et cliquez sur `+`
- **Supprimer des équipes**: Cliquez sur le `×` à côté du nom de l'équipe
- **Charger un exemple**: Cliquez sur "Charger exemple (6 équipes)" pour tester rapidement

⚠️ **Important**: Il faut un nombre pair d'équipes (minimum 2)

### 2. Paramètres de résolution

#### Type de tournoi

- **Simple (aller)**: Chaque équipe rencontre chaque autre équipe une fois
- **Double (aller-retour)**: Tournoi complet avec matchs aller et retour

#### Temps maximum

- Utilisez le curseur pour définir le temps de calcul (5 à 120 secondes)
- Plus le temps est long, meilleure sera l'optimisation
- Recommandé: 30 secondes pour 6-10 équipes

### 3. Génération du calendrier

1. Configurez vos équipes et paramètres
2. Cliquez sur **🚀 Générer le calendrier**
3. Attendez la résolution (une animation de chargement s'affiche)
4. Consultez les résultats !

### 4. Résultats

#### Métriques affichées

- **Breaks**: Nombre de matchs consécutifs à domicile ou à l'extérieur pour une même équipe (à minimiser)
  - Un "break" = 2 matchs d'affilée au même endroit
  - Objectif: Minimiser ce nombre pour plus d'équité
- **Nombre de journées**: Nombre total de journées de championnat

#### Vue Calendrier

- Affichage mensuel ou hebdomadaire
- Chaque événement représente un match
- Navigation avec les flèches `<` `>`

#### Journées de championnat

- Liste détaillée par journée
- Format: **Équipe Domicile** vs **Équipe Extérieur**
- **Bouton Inverser**: Permet d'échanger domicile/extérieur manuellement

### 5. Export

Cliquez sur **📥 Exporter JSON** pour télécharger le calendrier au format JSON:

```json
{
  "schedule": [...],
  "teams": [...],
  "objective": 4,
  "totalRounds": 5,
  "message": "Calendrier généré avec succès !"
}
```

## 🎯 Objectifs pédagogiques du projet

### Programmation par Contraintes (CP)

Le projet utilise **OR-Tools CP-SAT** pour résoudre le problème d'ordonnancement:

1. **Variables de décision**: Pour chaque match, qui joue à domicile?
2. **Contraintes**:

   - Chaque équipe rencontre toutes les autres
   - Alternance domicile/extérieur
   - Maximum de déplacements consécutifs (par défaut: 3)
   - Équité entre les équipes

3. **Fonction objectif**: Minimiser les "breaks"
   - Un break = 2 matchs consécutifs au même endroit (domicile ou extérieur)
   - Formule théorique: minimum = n-2 breaks pour n équipes

### Contraintes implémentées

#### 1. Contraintes de base

- ✅ Chaque paire d'équipes se rencontre exactement une fois (ou deux en mode double)
- ✅ Chaque équipe joue un match par journée (sauf bye en cas d'équipes impaires)

#### 2. Contraintes d'alternance

- ✅ Définition domicile/extérieur pour chaque match
- ✅ Liens entre les variables de match et les variables domicile

#### 3. Contraintes d'équité

- ✅ Limite de déplacements consécutifs (max_away_consec)
- ✅ Minimisation des breaks

## 📚 Références académiques

- **Régin (CP 2008)**: Minimizing breaks in sports schedules

  - Modèle CP pour tournoi simple ronde
  - Preuve du nombre minimal de breaks: n-2

- **Schaerf (1999)**: Sports scheduling

  - Revue complète des approches

- **ITC 2021 Sports Scheduling Track**
  - Compétition internationale
  - Utilisation de CP et métaheuristiques

## 🔧 Technologies utilisées

### Backend

- **FastAPI**: Framework web moderne (Python)
- **OR-Tools CP-SAT**: Solveur de contraintes de Google
- **Pydantic**: Validation des données
- **Uvicorn**: Serveur ASGI

### Frontend

- **React 18**: Bibliothèque UI
- **TypeScript**: Typage statique
- **Vite**: Build tool rapide
- **Bun**: Runtime JavaScript performant
- **FullCalendar**: Composant calendrier interactif
- **Tailwind CSS**: Framework CSS utilitaire

## 🐛 Résolution de problèmes

### L'API ne démarre pas

```bash
# Vérifier que l'environnement conda est activé
conda activate sender

# Vérifier que les dépendances sont installées
pip install -r requirements.txt

# Vérifier que le port 8000 est libre
lsof -i :8000
```

### Le frontend ne se connecte pas au backend

1. Vérifier que l'API est en cours d'exécution sur http://localhost:8000
2. Tester avec: `curl http://localhost:8000/health`
3. Vérifier les erreurs CORS dans la console du navigateur

### Aucune solution trouvée

- Augmenter le temps de résolution
- Vérifier que le nombre d'équipes est pair
- Pour de grandes instances (>20 équipes), le problème devient très difficile

### Erreur "Failed to load resource: ERR_CONNECTION_REFUSED"

- L'API backend n'est pas démarrée
- Démarrer l'API avec `./start_api.sh` ou `uvicorn src.api:app --reload`

## 💡 Astuces

### Pour de meilleurs résultats

- Utilisez au moins 30 secondes de temps de calcul
- Pour 6-8 équipes: 15-30 secondes suffisent
- Pour 10-12 équipes: 60-120 secondes recommandés

### Personnalisation

- Modifiez `max_away_consec` dans `src/model.py` pour changer la limite de déplacements consécutifs
- Ajoutez d'autres contraintes dans la classe `SchedulerModel`

### Test rapide

1. Cliquez sur "Charger exemple"
2. Gardez les paramètres par défaut (Simple, 30s)
3. Cliquez sur "Générer le calendrier"
4. Résultat en ~5-10 secondes
