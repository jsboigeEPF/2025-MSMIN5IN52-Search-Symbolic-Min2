# Configuration automatisée de serveurs Linux par contraintes (CSP)

Réalisé par : Mohammed Amine FARAH, Alban FLOUVAT, Amine BERRADA


**Ojectif** : explorer une approche d’intelligence artificielle symbolique, basée sur la programmation par contraintes (CSP), appliquée à un cas concret de cybersécurité et de conformité.

Objectif du projet

Ce projet vise à démontrer qu’il est possible de générer automatiquement une configuration de durcissement cohérente et pertinente pour un serveur Linux, à partir :

- de la criticité du serveur (faible, moyen, fort),

- de son usage (interne ou exposé web),

- et de règles de sécurité issues du CIS Benchmark Debian 12.

Le système produit :

- une sélection optimisée de recommandations CIS,

- une configuration technique structurée (sysctl, pare-feu, SSH, sudo, PAM),

- le tout sous forme d’un fichier YAML exploitable.

## Approche utilisée
Programmation par contraintes (CSP)

Le problème est modélisé comme un Constraint Satisfaction / Optimization Problem :

Variables

- Sélection ou non de chaque recommandation CIS

- Choix de l’outil pare-feu (UFW ou nftables)

Contraintes

- Contraintes de conformité (criticité, exposition)

- Contraintes d’exclusivité (un seul pare-feu)

- Contraintes de cohérence (ports ouverts par rapport aux règles pare-feu)

- Contraintes de sécurité (SSH, PAM, sudo)

Objectif

- Minimiser un coût global de durcissement (effort / complexité)

Le solveur utilisé est OR-Tools CP-SAT (Google).


## Architecture du projet
```
.
├── src/ # Moteur CSP (IA)
│ ├── cli.py # Interface ligne de commande
│ ├── knowledge.py # Base de connaissances (recommandations CIS)
│ ├── policy.py # Règles métier (criticité, usage)
│ ├── model.py # Modélisation CSP et résolution
│ └── render.py # Génération du YAML final
│
├── webapp/ # Interface web
│ ├── app.py # API FastAPI
│ └── templates/
│    └── index.html # Interface HTML
│
├── requirements.txt
├── README.md
└── .gitignore

```


## Installation

### Prérequis
- Python **3.10+**
- pip
- Environnement Linux / macOS / WSL

### Installation des dépendances

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Utilisation
Utilisation en ligne de commande (CLI)
Exemple basique :
```
python -m src.cli --criticality faible --usage interne
```
Exemples avancés :

```
python -m src.cli --criticality moyen --usage web --prefer-firewall ufw
python -m src.cli --criticality fort --usage web --prefer-firewall nftables --out config.yaml
```

Le programme affiche :
- le coût total de la configuration,
- les recommandations CIS sélectionnées,
- la configuration YAML générée.

Utilisation via interface web
Lancer le serveur :

```
uvicorn webapp.app:app --reload
```

Accéder à l’interface :
http://127.0.0.1:8000


## Fonctionnalités :

- sélection de la criticité et de l’usage,

- génération automatique de la configuration,

- téléchargement du fichier YAML.

## Tests et scénarios de démonstration

Le projet a été testé sur plusieurs **scénarios représentatifs** afin de valider la cohérence et la pertinence des configurations générées.

| Criticité | Usage   | Résultat |
|----------|--------|----------|
| Faible   | Interne | Durcissement minimal (sysctl, SSH) |
| Moyen    | Web     | Pare-feu, sudo et PAM |
| Fort     | Web     | Durcissement avancé (recommandations CIS niveau L2) |

Chaque scénario génère une configuration **cohérente**, **traçable** et **optimisée**, adaptée au niveau de risque et au contexte d’exposition du serveur.


## Limites et perspectives
### Limites actuelles
- Périmètre limité à Debian 12
- Base de connaissances CIS partielle
- Modélisation simplifiée des coûts

### Perspectives
- Support de nouveaux types d’actifs (bastion, base de données, conteneurs)
- Génération automatique de scripts Ansible


## Conclusion
Ce projet démontre qu’une approche d’intelligence artificielle symbolique peut être appliquée efficacement à des problématiques concrètes de cybersécurité et de conformité, en automatisant le raisonnement et la génération de configurations sécurisées tout en conservant traçabilité, explicabilité et cohérence.