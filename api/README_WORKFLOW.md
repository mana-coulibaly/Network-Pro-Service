# Workflow Strict des Tickets

## Vue d'ensemble

Le système de tickets utilise maintenant un workflow strict qui garantit que chaque étape doit être complétée avant de passer à la suivante.

## Workflow des États

```
CREATED → LEFT_HOME → WAREHOUSE_ARRIVED → WAREHOUSE_LEFT → 
SITE_ARRIVED → SITE_LEFT → BACK_HOME → COMPLETED
```

### États du workflow

1. **CREATED** : Ticket créé, pas encore commencé
2. **LEFT_HOME** : Technicien a quitté son domicile
3. **WAREHOUSE_ARRIVED** : Arrivé à l'entrepôt
4. **WAREHOUSE_LEFT** : Quitté l'entrepôt (déclenché automatiquement)
5. **SITE_ARRIVED** : Arrivé sur le site client
6. **SITE_LEFT** : Quitté le site client
7. **BACK_HOME** : Retourné au domicile
8. **COMPLETED** : Ticket complété avec description

## Mapping des Punches

| Punch Type | État Résultant | Description |
|------------|----------------|-------------|
| `leave_home` | LEFT_HOME | Quitter le domicile |
| `reach_wh` | WAREHOUSE_ARRIVED | Arriver à l'entrepôt |
| `start_site` | SITE_ARRIVED | Arriver sur le site (déclenche automatiquement WAREHOUSE_LEFT si nécessaire) |
| `leave_site` | SITE_LEFT | Quitter le site |
| `back_wh` | WAREHOUSE_ARRIVED | Retour à l'entrepôt |
| `back_home` | BACK_HOME | Retour au domicile |

## Installation

### 1. Exécuter la migration SQL

```bash
cd sql
psql "postgresql://postgres:postgres@localhost:5432/db_network" -f migration_workflow_states.sql
```

Ou utiliser le script Node.js :

```bash
cd api
node -e "require('dotenv').config(); const { Pool } = require('pg'); const fs = require('fs'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query(fs.readFileSync('../sql/migration_workflow_states.sql', 'utf8')).then(() => { console.log('Migration réussie'); process.exit(0); }).catch(e => { console.error('Erreur:', e); process.exit(1); });"
```

### 2. Vérifier que les fichiers sont en place

- ✅ `api/services/ticketWorkflow.js` - Service de validation du workflow
- ✅ `api/utils/workflowIntegration.js` - Utilitaires d'intégration
- ✅ `api/index.js` - Endpoints mis à jour

## Utilisation

### Créer un ticket

```javascript
POST /tickets
{
  "client_name": "Client ABC",
  "site_name": "Site 1",
  "site_address": "123 Rue Example",
  "purpose": "Maintenance"
}
```

Le ticket est créé avec l'état `CREATED`.

### Effectuer un punch

```javascript
POST /tickets/:id/timestamps
{
  "punch_type": "leave_home"
}
```

Le système valide automatiquement :
- Que le ticket est dans le bon état
- Que la transition est autorisée
- Met à jour l'état du ticket

### Compléter un ticket

```javascript
PATCH /tickets/:id/status
{
  "status": "COMPLETED",
  "description": "Travail effectué : remplacement de la carte réseau..."
}
```

Le système valide :
- Que le ticket est à l'état `BACK_HOME`
- Que l'odomètre est complété (départ et arrivée)
- Que tous les punches requis sont présents
- Que la description est fournie
- Qu'au moins une pièce a été ajoutée

## Validation Stricte

Le workflow empêche :
- ❌ De sauter des étapes
- ❌ De revenir en arrière (sauf cas spéciaux)
- ❌ De compléter un ticket sans avoir complété toutes les étapes précédentes

## Exemples d'erreurs

### Tentative de sauter une étape

```json
{
  "error": "Impossible d'effectuer ce punch. État actuel: CREATED, État requis: LEFT_HOME"
}
```

### Tentative de compléter sans prérequis

```json
{
  "error": "Impossible de compléter le ticket. Éléments manquants: odomètre (départ et arrivée), description du travail",
  "missing": ["odomètre (départ et arrivée)", "description du travail"]
}
```

## Architecture

```
api/
├── services/
│   └── ticketWorkflow.js      # Logique de validation du workflow
├── utils/
│   └── workflowIntegration.js  # Intégration avec les endpoints
└── index.js                     # Endpoints mis à jour
```

## Notes importantes

1. **Rétrocompatibilité** : Les anciens tickets avec `draft`, `en_cours`, `clos` sont automatiquement convertis lors de la migration
2. **État automatique** : `WAREHOUSE_LEFT` est déclenché automatiquement quand on fait `start_site` depuis `WAREHOUSE_ARRIVED`
3. **Validation stricte** : Impossible de contourner le workflow, chaque transition est validée
