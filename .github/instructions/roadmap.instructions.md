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

## Phase 2 : Performance & Robustesse ✅ TERMINÉE
Améliorer la rapidité de lancement des parties et la fiabilité.

- [x] **Système de Cache des Paroles (Supabase)**
    - **Problème** : `getLyrics` est lent et rate-limited.
    - **Solution implémentée** :
        - ✅ Table `lyrics_cache` créée dans Supabase (track_id, lyrics_json, has_synced)
        - ✅ Vérification du cache avant appel API dans `getCachedLyrics`
        - ✅ Sauvegarde automatique dans la DB après récupération API
        - ✅ Fonctions utilitaires : `getCacheStats()` et `clearLyricsCache()`
        - ✅ Migration de localStorage vers Supabase pour un cache partagé

## Phase 3 : Multijoueur Temps Réel (Supabase Realtime) ✅ TERMINÉE
Permettre aux utilisateurs de jouer ensemble.

- [x] **Architecture Backend (Supabase)**
    - ✅ Table `rooms` (code, host_id, status, current_track, is_private, matchmaking_queue_id).
    - ✅ Table `room_players` (room_id, user_id, score, is_ready, is_host).
    - ✅ Gestion du chef de partie (host) :
        - Le premier joueur à entrer dans une salle devient host.
        - Transfert automatique du rôle de host si le host quitte ou se déconnecte.
    - ✅ Limite de 10 joueurs maximum par salle (validation côté client + serveur).
    - ✅ Système de matchmaking simple :
        - File d'attente publique pour trouver une partie avec des joueurs de même mode/playlist.
        - Possibilité de créer une partie privée (code de salle à partager) ou de rejoindre via code.
    - ✅ Utiliser les "Broadcast" channels de Supabase pour les événements de jeu.

- [x] **Interface Lobby**
    - ✅ Créer / Rejoindre une salle via un code (parties privées).
    - ✅ Accéder à une file de matchmaking pour rejoindre une partie publique.
    - ✅ Liste des joueurs en attente (pseudo, statut prêt / pas prêt, indicateur host).
    - ✅ Bouton "Prêt / Pas prêt" pour chaque joueur.
    - ✅ Bouton "Lancer la partie" visible uniquement par le host et activable uniquement si tous les joueurs sont prêts.
    - ✅ Bouton d'exclusion (kick) par le host pour retirer un joueur de la salle.
    - ✅ Affichage clair de l'état du lobby (ex: "En attente de joueurs", "En attente de prêts", "Prêt à démarrer", "Partie en cours", "Partie terminée").

- [x] **Synchronisation du Jeu**
    - ✅ Le "Host" contrôle la lecture et la progression du jeu.
    - ✅ Broadcast des réponses des joueurs en temps réel.
    - ✅ La partie continue jusqu'à la fin même si un joueur quitte.
    - ✅ Affichage des scores en direct après chaque question.

- [x] **Feedback de Jeu de Base**
    - ✅ Indication claire de bonne / mauvaise réponse.
    - ✅ Affichage des scores de tous les joueurs en temps réel.

- [x] **Social Multijoueur de Base**
    - ✅ Chat de lobby avant et pendant une partie multijoueur.
    - ✅ Affichage des joueurs connectés dans la salle (pseudo, statut prêt / non prêt).

**Fichiers créés pour la Phase 3** :
- `/src/types/multiplayer.ts` : Types pour le multijoueur
- `/src/hooks/useMultiplayerRoom.ts` : Hook principal pour gérer les salles
- `/src/hooks/useMatchmaking.ts` : Hook pour le matchmaking
- `/src/components/multiplayer/PlayModeSelect.tsx` : Sélection Solo/Multi
- `/src/components/multiplayer/MultiplayerLobbySelect.tsx` : Créer/Rejoindre salle
- `/src/components/multiplayer/MultiplayerLobby.tsx` : Lobby d'attente
- `/src/components/multiplayer/MultiplayerGame.tsx` : Jeu multijoueur synchronisé
- `/src/app/multiplayer/page.tsx` : Page d'accueil multijoueur
- `/src/app/multiplayer/lobby/[id]/page.tsx` : Page du lobby
- `/src/app/multiplayer/game/[id]/page.tsx` : Page de jeu
- `/src/app/multiplayer/results/[id]/page.tsx` : Page de résultats
- `/supabase/setup.sql` : Schéma de base de données mis à jour
- `/MULTIPLAYER_SETUP.md` : Documentation de configuration

## Phase 4 : UX & "Juice" ✅ TERMINÉE
Améliorer l'expérience visuelle et rendre le jeu plus satisfaisant.

- [x] **Feedback Visuel Avancé**
    - ✅ Animations de combo (x2, x3...) avec échelle et couleurs progressives
    - ✅ Particules lors d'une bonne réponse (étoiles, cœurs, notes de musique)
    - ✅ Shake effect lors d'une erreur avec flash rouge
    - ✅ Fichiers créés :
        - `/src/components/game/ComboAnimation.tsx` : Affichage animé des combos
        - `/src/components/game/ParticleEffect.tsx` : Système de particules
        - `/src/components/game/ShakeEffect.tsx` : Effets de secousse et erreur
    - ✅ Intégration dans MusicQuiz2 et MultiplayerGame
    - ✅ Animations CSS personnalisées ajoutées à globals.css
    - ✅ Utilisation de Framer Motion pour des animations fluides

**Détails techniques** :
- **ComboAnimation** : Animation avec rotation, échelle, et couleurs qui évoluent selon le combo (vert→bleu→jaune→orange→violet)
- **ParticleEffect** : 3 types (success, perfect, streak) avec intensité variable, particules qui explosent du centre
- **ShakeEffect** : Composant wrapper pour secouer n'importe quel élément + overlay rouge pour les erreurs
- Tous les effets sont déclenchés par des triggers numériques pour éviter les re-renders inutiles

## Phase 4.5 : Corrections & Robustesse ✅ TERMINÉE
- [x] **Modes & Générateurs**
    - Retiré le type `AlbumQuestion` non implémenté des types et de toutes les références dans le code.
- [x] **Multijoueur**
    - Comptage des joueurs sur la table `room_players` sans dépendre de `is_connected` pour respecter la limite de 10 joueurs.
    - Lors de l'insertion d'un joueur, `is_connected` est maintenant explicitement défini à `true`.
    - Ajout d'un handler de réception pour les events broadcastés dans `useMultiplayerRoom`.
    - Réduction des rechargements complets du lobby en temps réel avec debounce (200ms) et `showLoading=false` pour éviter de remettre `isLoading` à chaque notification.
- [x] **Lecteur Spotify**
    - Remplacement de la boucle d'attente active `while (!isReady ...)` par un système de Promise avec timeout, utilisant des refs pour éviter les stale closures.
- [x] **Code mort / bruit**
    - Suppression de la déstructuration inutile `currentTrack: spotifyTrack` dans `MusicQuiz2`.
    - Suppression du fichier legacy `src/components/game/MusicQuiz.old.tsx`.

## Phase 5 : Social & Progression 🚧 EN COURS
- [x] **Système de Progression** ✅ IMPLÉMENTÉ
    - ✅ Niveaux de compte avec expérience (XP).
    - ✅ Gain d'XP en fonction des performances de jeu (+10 XP par bonne réponse).
    - ✅ Formule de progression : Niveau 1→2 = 100 XP, puis multiplication par 1.2 à chaque niveau.
    - ✅ Affichage du niveau et XP dans la navbar avec avatar progressif.
    - ✅ Popup de récompense XP en fin de partie avec animation.
    - ✅ Table Supabase `player_progress` pour stocker la progression.
    - ✅ Fichiers créés :
        - `/src/lib/player-progress.ts` : Utilitaires de calcul XP/niveau
        - `/src/hooks/usePlayerProgress.ts` : Hook React pour la progression
        - `/src/components/PlayerAvatar.tsx` : Avatar avec cercle de progression
        - `/src/components/XPReward.tsx` : Popup de récompense XP
        - `/supabase/player-progress.sql` : Schéma de base de données
        - `/CHANGELOG_XP_SYSTEM.md` : Documentation du système
    - ⏳ Paliers de niveaux débloquant des récompenses (à venir).

- [ ] **Quêtes & Défis**
    - Quêtes quotidiennes (ex: "Jouer 5 parties en mode Survie").
    - Défis hebdomadaires (ex: "Atteindre un combo de x10").
    - Récompenses en XP et cosmétiques.

- [ ] **Battle Pass**
    - Système de saison avec récompenses progressives.
    - Version gratuite et premium.
    - Objets cosmétiques exclusifs à chaque saison.

- [ ] **Profil Joueur**
    - Statistiques détaillées (Genre préféré, Artiste le mieux connu).
    - Badges / Succès.
    - Avatar personnalisable.
    - Skins / Thèmes d'interface déblocables.

- [ ] **Système Social**
    - Liste d'amis (ajout, suppression, statut en ligne).
    - Chat général pour tous les joueurs.
    - Messages privés entre amis.
    - Améliorations du lobby (statuts enrichis, emotes, historique de messages).

## Phase 6 : Intégration Multi-Plateformes
- [ ] **Support d'autres services de streaming**
    - Intégration Deezer (auth, récupération de bibliothèque / playlists).
    - Intégration YouTube Music.
    - Intégration Apple Music.
    - Abstraction d'un layer "Music Provider" pour éviter le vendor lock-in Spotify.
