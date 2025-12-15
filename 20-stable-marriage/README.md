# Problème des Mariages Stables - Application Web

Application web pour comparer l'algorithme de Gale-Shapley et la résolution CSP avec arc-consistance.

---

## Architecture

```
stable-marriage/
├── index.html           # Interface HTML
└── stable-marriage.js   # Logique JavaScript
```

Deux fichiers seulement. Le fichier HTML charge le fichier JavaScript.

---

## Lancement

### Option 1 : Double-clic (le plus simple)

1. Téléchargez les deux fichiers
2. Mettez-les dans le même dossier
3. Double-cliquez sur `index.html`

### Option 2 : Serveur local

```bash
# Avec Python
python3 -m http.server 8000
# Ouvrir http://localhost:8000

# Avec Node
npx http-server
# Ouvrir l'URL affichée
```

---

## Utilisation rapide

1. **Configuration** : choisir le nombre de personnes (n), cliquer sur "Régénérer"
2. **Gale-Shapley** : cliquer sur "Exécuter", utiliser les flèches pour voir l'animation
3. **CSP** : cliquer sur "Résoudre avec CSP"
4. **Comparaison** : voir les deux résultats côte-à-côte
