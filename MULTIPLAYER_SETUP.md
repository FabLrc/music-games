# Configuration de la Base de Données Multijoueur

## Étapes pour configurer Supabase

### 1. Accéder au SQL Editor

1. Connectez-vous à votre projet Supabase sur [supabase.com](https://supabase.com)
2. Dans le menu latéral, cliquez sur **SQL Editor**
3. Cliquez sur **New Query**

### 2. Exécuter le Script SQL

1. Ouvrez le fichier `supabase/setup.sql` dans votre éditeur de code
2. Copiez **tout le contenu** du fichier
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur **Run** pour exécuter le script

Le script va créer :
- Les tables existantes (`game_sessions`, `lyrics_cache`)
- Les nouvelles tables pour le multijoueur :
  - `matchmaking_queues` : Files d'attente pour le matchmaking
  - `rooms` : Salles de jeu
  - `room_players` : Joueurs dans les salles
  - `chat_messages` : Messages de chat
- Les index pour optimiser les performances
- Les politiques RLS (Row Level Security) pour la sécurité
- Les fonctions utilitaires (`generate_room_code`, `cleanup_inactive_rooms`)

### 3. Vérifier l'installation

Après l'exécution du script, vérifiez que les tables ont été créées :

1. Dans le menu latéral, cliquez sur **Table Editor**
2. Vous devriez voir les nouvelles tables :
   - `matchmaking_queues`
   - `rooms`
   - `room_players`
   - `chat_messages`

### 4. Activer Realtime (Important !)

Pour que le multijoueur fonctionne en temps réel, vous devez activer Realtime sur les tables :

1. Allez dans **Database** > **Replication**
2. Dans la section **Realtime**, activez les tables suivantes :
   - ✅ `rooms`
   - ✅ `room_players`
   - ✅ `chat_messages`
3. Cliquez sur **Save**

### 5. Configuration Optionnelle

#### Nettoyage automatique des salles inactives

Pour nettoyer automatiquement les salles inactives, vous pouvez créer un cron job dans Supabase :

1. Allez dans **Database** > **Extensions**
2. Activez l'extension **pg_cron**
3. Exécutez cette requête SQL :

```sql
-- Nettoyer les salles inactives toutes les 10 minutes
SELECT cron.schedule(
  'cleanup-inactive-rooms',
  '*/10 * * * *',
  $$SELECT cleanup_inactive_rooms()$$
);
```

## Fonctionnalités Multijoueur Implémentées

### ✅ Architecture Backend
- [x] Tables pour les salles et joueurs
- [x] Système de host avec transfert automatique
- [x] Limite de 10 joueurs par salle
- [x] Matchmaking public et parties privées
- [x] Événements Broadcast pour la synchronisation

### ✅ Interface Lobby
- [x] Créer/Rejoindre une salle via code
- [x] Matchmaking automatique
- [x] Liste des joueurs avec statuts
- [x] Bouton Prêt/Pas prêt
- [x] Bouton de lancement (host uniquement)
- [x] Exclusion de joueurs (host uniquement)
- [x] Affichage de l'état du lobby

### ✅ Synchronisation du Jeu
- [x] Le host contrôle la progression
- [x] Broadcast des réponses en temps réel
- [x] Affichage des scores en direct

### ✅ Chat de Lobby
- [x] Chat en temps réel dans le lobby
- [x] Affichage des messages

## Prochaines Étapes (Phase 3 - Suite)

Les éléments suivants peuvent être améliorés :

1. **Synchronisation Audio** : Améliorer la synchronisation de la lecture Spotify entre joueurs
2. **Gestion de la Déconnexion** : Meilleure gestion quand le host se déconnecte en cours de partie
3. **Animations** : Ajouter des animations pour les événements multijoueur
4. **Emoji/Reactions** : Permettre aux joueurs de réagir en temps réel
5. **Statistiques de Partie** : Historique des parties multijoueur

## Dépannage

### Les joueurs ne se voient pas en temps réel
- Vérifiez que Realtime est activé sur les tables `rooms`, `room_players`, et `chat_messages`
- Assurez-vous que les politiques RLS sont correctement configurées

### Erreur "Room not found"
- Vérifiez que le code de salle est correct (6 caractères en majuscules)
- La salle peut avoir été supprimée après 10 minutes d'inactivité

### Les messages de chat n'apparaissent pas
- Vérifiez que Realtime est activé sur `chat_messages`
- Regardez la console du navigateur pour voir s'il y a des erreurs
