# 📊 Statistiques d'équité et contraintes avancées

## Nouvelles fonctionnalités ajoutées

### 1. Paramètre : Jours de match par semaine 📅

**Description :** Permet de définir le nombre de jours de match autorisés par semaine dans le calendrier.

**Interface :**

- Curseur interactif (1 à 7 jours)
- Valeur par défaut : 1 jour par semaine
- Impact : Espacement des matchs dans le calendrier généré

**Utilisation :**

- Permet de simuler des contraintes de disponibilité de stade
- Utile pour gérer les conflits avec d'autres événements
- Aide à répartir la charge sur plusieurs jours

**API :**

```json
{
  "teams": ["PSG", "OM", "Lyon"],
  "rounds": "single",
  "max_time": 30,
  "match_days_per_week": 2
}
```

### 2. Statistiques d'équité ajoutées

#### 2.1 Déplacements (Total Travel Distance) 🚗

**Définition :** Nombre total de matchs à l'extérieur pour chaque équipe.

**Objectif :** Garantir une répartition équitable de la charge de déplacement.

**Affichage :**

- Badge orange dans le tableau des statistiques
- Format : `🚗 X` où X est le nombre de déplacements

**Interprétation :**

- Idéalement, chaque équipe devrait avoir un nombre de déplacements similaire
- En tournoi aller simple : environ n/2 déplacements (où n = nombre total de journées)
- En tournoi aller-retour : environ n déplacements

#### 2.2 Variété des adversaires (Opponent Variety) 🎯

**Définition :** Nombre d'adversaires différents affrontés par chaque équipe.

**Objectif :** Mesurer la diversité des confrontations.

**Affichage :**

- Badge indigo dans le tableau des statistiques
- Format : `🎯 X` où X est le nombre d'adversaires différents

**Interprétation :**

- Maximum théorique : nombre d'équipes - 1
- Tournoi aller simple : devrait être = nombre d'équipes - 1
- Tournoi aller-retour : idem
- Équipes impaires avec bye : peut être < nombre d'équipes - 1

### 3. Tableau des statistiques enrichi

Le tableau affiche maintenant **8 colonnes** :

| Colonne                  | Description                     | Code couleur          |
| ------------------------ | ------------------------------- | --------------------- |
| **Équipe**               | Nom de l'équipe                 | -                     |
| **Breaks**               | Changements domicile/extérieur  | 🟢 0 / 🟡 1-2 / 🔴 >2 |
| **Domicile**             | Nombre de matchs à domicile     | Bleu                  |
| **Extérieur**            | Nombre de matchs à l'extérieur  | Violet                |
| **Déplacements 🚗**      | Nombre total de déplacements    | Orange                |
| **Adversaires 🎯**       | Nombre d'adversaires différents | Indigo                |
| **Max Ext. consécutifs** | Séquence maximale à l'extérieur | 🟢 ≤2 / 🟡 3 / 🔴 >3  |
| **Max Dom. consécutifs** | Séquence maximale à domicile    | 🟢 ≤2 / 🟡 3 / 🔴 >3  |

## Contraintes d'équité garanties par l'optimisation

### Contraintes existantes (maintenues)

1. **Minimisation des breaks** : Objectif principal du solveur
2. **Alternance domicile/extérieur** : Éviter trop de matchs consécutifs du même type
3. **Limite de matchs extérieurs consécutifs** : Maximum 3 par défaut
4. **Support équipes impaires** : Système de bye automatique

### Nouvelles contraintes d'équité (calculées et affichées)

1. **Équité des déplacements** :

   - Chaque équipe devrait avoir un nombre similaire de matchs à l'extérieur
   - Écart-type minimal entre équipes

2. **Diversité des confrontations** :
   - Maximiser le nombre d'adversaires différents affrontés
   - Important pour l'équité du championnat

## Exemple de lecture des statistiques

```
Équipe    | Breaks | Dom. | Ext. | Dépl. | Adv. | Max Ext. | Max Dom.
----------------------------------------------------------------------
PSG       |   1    |  3   |  2   | 🚗 2  | 🎯 5 |    1     |    2
OM        |   0    |  3   |  2   | 🚗 2  | 🎯 5 |    1     |    2
Lyon      |   2    |  2   |  3   | 🚗 3  | 🎯 5 |    2     |    1
```

**Interprétation :**

- ✅ **PSG** : Excellent équilibre, 1 seul break, bon équilibre domicile/extérieur
- ✅ **OM** : Parfait, 0 breaks, équilibre parfait
- ⚠️ **Lyon** : 2 breaks (limite acceptable), légèrement plus de déplacements

## Utilisation pratique

### Pour tester l'équité :

1. Générer un grand nombre d'équipes (10-50) avec le générateur aléatoire
2. Lancer l'optimisation
3. Vérifier que :
   - Les déplacements sont équilibrés (écart max de 1-2 entre équipes)
   - Tous les adversaires sont affrontés (variété = n-1)
   - Les breaks sont minimisés
   - Les séquences consécutives respectent les limites

### Paramètres recommandés :

- **Petits tournois (4-8 équipes)** :

  - Temps max : 15-30s
  - Jours de match : 1-2 par semaine

- **Moyens tournois (10-20 équipes)** :

  - Temps max : 30-60s
  - Jours de match : 2-3 par semaine

- **Grands tournois (20-50 équipes)** :
  - Temps max : 60-120s
  - Jours de match : 3-5 par semaine

## Formules mathématiques

### Nombre de déplacements attendu (tournoi simple) :

```
Déplacements ≈ (n - 1) / 2
où n = nombre d'équipes
```

### Nombre de déplacements attendu (tournoi double) :

```
Déplacements ≈ n - 1
où n = nombre d'équipes
```

### Variété des adversaires (maximum) :

```
Adversaires = n - 1
où n = nombre d'équipes
```

## Codes couleurs et seuils

### Breaks :

- 🟢 **Vert** : 0 breaks (optimal)
- 🟡 **Jaune** : 1-2 breaks (acceptable)
- 🔴 **Rouge** : >2 breaks (à améliorer)

### Matchs consécutifs :

- 🟢 **Vert** : ≤2 consécutifs (bon)
- 🟡 **Jaune** : 3 consécutifs (limite)
- 🔴 **Rouge** : >3 consécutifs (problématique)

## Améliorations futures possibles

1. **Distances géographiques réelles** :

   - Intégrer les distances entre stades
   - Optimiser les déplacements réels (km)

2. **Contraintes de repos** :

   - Nombre de jours minimum entre matchs
   - Éviter 3 matchs en 7 jours

3. **Préférences de stade** :

   - Certains stades disponibles certains jours
   - Contraintes de capacité

4. **Contraintes TV** :

   - Matchs d'affiche en prime time
   - Distribution équitable des créneaux attractifs

5. **Historique** :
   - Éviter certaines confrontations trop fréquentes
   - Équilibrer sur plusieurs saisons
