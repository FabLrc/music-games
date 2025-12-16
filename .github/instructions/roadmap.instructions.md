---
applyTo: '**'
---
# Roadmap de Développement - Music Games

Ce document sert de guide pour le développement futur de l'application Music Games. Il est destiné à guider les agents IA et les développeurs dans l'implémentation de nouvelles fonctionnalités.

##  Phase 1 : Diversification du Gameplay (Nouveaux Modes) ✅ TERMINÉE
L'objectif est de sortir du modèle unique "Lyrics Quiz" pour offrir plus de variété.

- [x] **Refactoring du Moteur de Jeu**
    - ✅ Logique de jeu extraite vers le hook `useGameEngine`
    - ✅ Interface commune créée pour les "Questions" (Lyrics, Titre, Artiste, etc.)
    - ✅ Fichiers créés :
        - `/src/types/game.ts` : Types pour tous les modes de jeu
        - `/src/hooks/useGameEngine.ts` : Hook générique pour gérer le flow du jeu
        - `/src/lib/question-generator.ts` : Générateurs de questions
        - `/src/components/game/GameModeSelector.tsx` : Sélecteur de mode
        - `/src/components/game/MusicQuiz2.tsx` : Nouveau composant refactoré

- [x] **Mode "Blind Test" (Classique)**
    - **Concept** : Écouter un extrait et deviner le Titre ou l'Artiste.
    - **Implémentation** :
        - ✅ Pas besoin de fetch les paroles (chargement plus rapide !)
        - ✅ Génération de "distracteurs" depuis d'autres pistes de la playlist/album
        - ✅ Deux modes : "Deviner le Titre" (`blind-test-title`) et "Deviner l'Artiste" (`blind-test-artist`)
        - ✅ Extrait de 15 secondes démarrant aléatoirement dans la chanson

- [x] **Mode "Survie" (Survival)**
    - **Concept** : Une seule vie. La partie s'arrête à la première erreur.
    - **Implémentation** :
        - ✅ Détection de la fin de partie au premier échec
        - ✅ Score basé sur le nombre de pistes enchaînées
        - ✅ Système de combo intégré (affichage du multiplicateur)
        - ✅ Statistiques de jeu (combo max, temps moyen de réponse)

## Phase 2 : Performance & Robustesse
Améliorer la rapidité de lancement des parties et la fiabilité.

- [ ] **Système de Cache des Paroles (Supabase)**
    - **Problème** : `getLyrics` est lent et rate-limited.
    - **Solution** :
        - Créer une table `lyrics_cache` dans Supabase (track_id, lyrics_json, synced).
        - Avant d'appeler l'API externe, vérifier la DB.
        - Si trouvé via API, sauvegarder dans la DB.

- [ ] **Pré-chargement (Prefetching)**
    - Charger la piste N+1 (audio + données) pendant que le joueur joue la piste N.
    - Réduire le temps d'attente entre les manches.

## Phase 3 : Multijoueur Temps Réel (Supabase Realtime)
Permettre aux utilisateurs de jouer ensemble.

- [ ] **Architecture Backend (Supabase)**
    - Table `rooms` (code, host_id, status, current_track).
    - Table `room_players` (room_id, user_id, score).
    - Utiliser les "Broadcast" channels de Supabase pour les événements de jeu (Start, NextTrack, Answer).

- [ ] **Interface Lobby**
    - Créer / Rejoindre une salle via un code.
    - Liste des joueurs en attente.

- [ ] **Synchronisation du Jeu**
    - Le "Host" contrôle la lecture Spotify (ou synchronisation approximative via timestamp serveur).
    - Affichage des scores en direct après chaque question.

## Phase 4 : UX & "Juice"
Rendre l'expérience plus satisfaisante visuellement.

- [ ] **Feedback Visuel Avancé**
    - Animations de combo (x2, x3...).
    - Particules lors d'une bonne réponse.
    - Shake effect lors d'une erreur.

- [ ] **Visualisation Audio Réelle (Expérimental)**
    - Ajouter une option pour utiliser le microphone du navigateur pour capturer l'audio système (si l'utilisateur joue sur enceintes) et animer le background avec de vraies données FFT.

## Phase 5 : Social & Progression
- [ ] **Profil Joueur**
    - Statistiques détaillées (Genre préféré, Artiste le mieux connu).
    - Badges / Succès.
