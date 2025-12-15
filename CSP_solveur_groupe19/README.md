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

