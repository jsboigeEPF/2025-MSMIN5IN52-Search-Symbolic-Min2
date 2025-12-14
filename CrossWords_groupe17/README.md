README — Générateur de mots croisés Python
Description

Ce projet propose un générateur de mots croisés en Python.
Il place automatiquement une liste de mots dans une grille carrée de taille configurable, en respectant les règles de base des mots croisés (pas de lettres collées, mots croisés possibles, vérification des débuts et fins de mots).

Fonctionnalités

Placement automatique de mots avec croisement possible.

Respect des règles de base des mots croisés.

Grille configurable (taille par défaut : 17x17).

Calcul d’un score indicatif basé sur le nombre de mots, lettres et croisements.

Installer Python 3.x si ce n’est pas déjà fait.
Le script ne nécessite aucune librairie externe.

Exécuter le script :

python crosswords.py

Utilisation
Exemple d’exécution
from crossword import Crossword

words = ["PYTHON", "CODE", "IA", "ALGORITHME", "DONNEES", "LOGIQUE"]
cw = Crossword(size=12)
cw.generate(words)
cw.print_grid()
print("Score :", cw.score())

Grille

Le script affiche la grille en console avec le caractère . pour les cases vides et les lettres placées pour les mots.