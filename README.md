# 🥗 Application de Réservation de Repas - CNC Cholonge

## Version : 1.0.0

Bienvenue dans l'application de réservation de repas du **Club Nautique de Cholonge (CNC)**.  
Cette application est destinée à faciliter l'organisation des repas du midi pour les **bénévoles, le staff du club house et les membres de l'équipe de voile** pendant les événements ou les périodes d'activité du club.

## 🚀 Fonctionnalités principales

- Interface simple pour réserver un repas à l’avance.
- Gestion des jours de service et des options de repas.
- Vue d’administration pour le staff afin de gérer les commandes.
- Statistiques de réservation par jour ou par utilisateur.
- Notifications pour les responsables du repas (à venir).

## 🛠️ Installation & Déploiement

### Activation de l'environnement virtuel (sur o2switch)

source /home/cnc38/virtualenv/repas.cncholonge.fr/3.10/bin/activate 
cd /home/cnc38/repas.cncholonge.fr

### Fichier WSGI (point d'entrée pour le déploiement)

chemin : cnc_repas/wsgi.py

### Mettre a jour depuis le depot distant
git fetch origin
git reset --hard origin/main

## ⚙️ Commandes de gestion Django

### 🔄 Migrations (à faire lors de modifications dans les modèles)

python manage.py makemigrations
python manage.py migrate

### 🧼 Collecte des fichiers statiques (à faire après modifications dans le dossier static)

python manage.py collectstatic


