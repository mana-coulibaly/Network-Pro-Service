# API Network Pro Service

## Configuration

### Variables d'environnement requises

Créez un fichier `.env` à la racine du dossier `api/` avec les variables suivantes :

```env
# Configuration de la base de données PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/db_network

# Secret JWT pour signer les tokens (OBLIGATOIRE)
# Utilisez une chaîne aléatoire sécurisée (minimum 32 caractères)
JWT_SECRET=votre_secret_jwt_tres_securise_ici_changez_moi

# Durée de vie des tokens (optionnel)
JWT_EXPIRES=15m
REFRESH_EXPIRES=30d

# Port du serveur API (optionnel, défaut: 3000)
PORT=3000

# Environnement (development ou production)
NODE_ENV=development

# Domaine pour les emails générés (optionnel)
EMAIL_DOMAIN=networkproservices.com

# URL du frontend (optionnel, pour CORS)
FRONTEND_URL=http://localhost:5173
```

### ⚠️ IMPORTANT : JWT_SECRET

Le `JWT_SECRET` est **OBLIGATOIRE**. Sans cette variable, l'authentification échouera avec une erreur 500.

Pour générer un secret sécurisé, vous pouvez utiliser :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Installation

```bash
npm install
```

## Démarrage

### Mode développement (avec rechargement automatique)
```bash
npm run dev
```

### Mode production
```bash
npm start
```

## Migration de la base de données

Si vous obtenez des erreurs de colonnes manquantes (par exemple "column first_name does not exist"), vous devez exécuter le script de migration :

```bash
psql -d db_network -f ../sql/migration_add_user_columns.sql
```

Ou si vous utilisez une URL de connexion complète :

```bash
psql "postgresql://username:password@localhost:5432/db_network" -f ../sql/migration_add_user_columns.sql
```

Ce script ajoutera automatiquement toutes les colonnes manquantes nécessaires :
- `first_name`, `last_name`, `is_active`, `must_change_password`, `token_version`, `password_changed_at` dans la table `users`
- `odo_start`, `odo_end`, `description` dans la table `tickets`
- Mise à jour des contraintes pour permettre les valeurs `'team_lead'`, `'broken'`, `'none'` dans les colonnes appropriées

## Dépannage

### Erreur 500 lors de la connexion

1. **Vérifiez que `JWT_SECRET` est défini** dans votre fichier `.env`
2. **Vérifiez la connexion à la base de données** :
   - PostgreSQL doit être en cours d'exécution
   - La base de données `db_network` doit exister
   - Les identifiants dans `DATABASE_URL` doivent être corrects
3. **Exécutez la migration** si vous obtenez des erreurs de colonnes manquantes (voir section ci-dessus)
4. **Consultez les logs du serveur** pour voir l'erreur exacte. Les erreurs SQL détaillées sont maintenant affichées en mode développement.

### Erreur CORS

Si vous obtenez des erreurs CORS, vérifiez que l'URL de votre frontend est dans la liste des origines autorisées dans `api/index.js`.
