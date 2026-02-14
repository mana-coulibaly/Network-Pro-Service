# Modifications des endpoints pour le workflow strict

## Instructions d'intégration

Remplacez les sections suivantes dans `api/index.js` :

### 1. Ajouter les imports en haut du fichier (après les autres requires)

```javascript
const ticketWorkflow = require('./services/ticketWorkflow');
const { updateTicketStateFromPunch, validateTicketCompletion } = require('./utils/workflowIntegration');
```

### 2. Modifier POST /tickets (ligne ~848)

**REMPLACER :**
```javascript
const { rows } = await pool.query(
    `insert into tickets(tech_id, client_name, site_name, site_address, ticket_status, purpose)
    values ($1,$2,$3,$4,'draft',$5)
    returning id, client_name, site_name, site_address,
        ticket_status as status, purpose, created_at as "createdAt"`,
    [req.user.sub, client_name, site_name, site_address, purpose ?? null]
);
```

**PAR :**
```javascript
const { rows } = await pool.query(
    `insert into tickets(tech_id, client_name, site_name, site_address, ticket_status, purpose)
    values ($1,$2,$3,$4,'CREATED',$5)
    returning id, client_name, site_name, site_address,
        ticket_status as status, purpose, created_at as "createdAt"`,
    [req.user.sub, client_name, site_name, site_address, purpose ?? null]
);
```

### 3. Modifier POST /tickets/:id/timestamps (ligne ~940)

**REMPLACER toute la fonction (lignes ~940-1008) PAR :**

```javascript
app.post("/tickets/:id/timestamps", requireAuth, requireRole("tech"), async (req, res) => {
    try {
        const { id } = req.params;
        const { punch_type } = req.body || {};

        // 1) Validation du type de punch
        const allowed = ["leave_home", "reach_wh", "start_site", "leave_site", "back_wh", "back_home"];
        if (!allowed.includes(punch_type)) {
            return res.status(400).json({ error: "punch_type invalide" });
        }

        // 2) Ownership : le ticket doit appartenir au tech connecté
        const own = await pool.query(
            `select ticket_status from tickets where id=$1 and tech_id=$2`,
            [id, req.user.sub]
        );
        if (!own.rowCount) return res.status(403).json({ error: "Not your ticket" });

        const currentState = own.rows[0].ticket_status;

        // 3) Validation du workflow : vérifier si le punch est autorisé
        const validation = ticketWorkflow.canPerformPunch(currentState, punch_type);
        if (!validation.valid) {
            return res.status(409).json({ error: validation.error });
        }

        // 4) Timestamp serveur (pas celui du client)
        const when = new Date().toISOString();

        // 5) Insert "one-shot" : si déjà présent, DO NOTHING
        const ins = await pool.query(
            `insert into ticket_timestamps(ticket_id, punch_type, ts)
            values ($1,$2,$3)
            on conflict (ticket_id, punch_type) do nothing
            returning ts`,
            [id, punch_type, when]
        );

        // 6) Si insert OK -> mettre à jour l'état du ticket
        if (ins.rowCount) {
            // Mettre à jour l'état selon le workflow
            const result = await updateTicketStateFromPunch(pool, id, punch_type);
            
            if (!result.success) {
                // Rollback du timestamp si la mise à jour d'état échoue
                await pool.query(
                    `DELETE FROM ticket_timestamps WHERE ticket_id=$1 AND punch_type=$2`,
                    [id, punch_type]
                );
                return res.status(409).json({ error: result.error });
            }

            return res.json({
                ok: true,
                ticket_id: id,
                punch_type,
                ts: ins.rows[0].ts,
                new_state: result.newState,
                already_exists: false,
            });
        }

        // 7) Si déjà existant -> renvoyer le ts existant
        const existing = await pool.query(
            `select ts from ticket_timestamps
            where ticket_id=$1 and punch_type=$2`,
            [id, punch_type]
        );

        return res.json({
            ok: true,
            ticket_id: id,
            punch_type,
            ts: existing.rows[0]?.ts || null,
            already_exists: true,
        });
    } catch (e) {
        console.error("punch error:", e);
        return res.status(500).json({ error: "fail_punch" });
    }
});
```

### 4. Modifier PATCH /tickets/:id/status (ligne ~1100)

**REMPLACER toute la fonction (lignes ~1100-1141) PAR :**

```javascript
app.patch('/tickets/:id/status', requireAuth, requireRole('tech'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, description } = req.body || {};

        // Seul COMPLETED est autorisé via cet endpoint
        if (status !== 'COMPLETED') {
            return res.status(400).json({ error: 'Seul le statut COMPLETED peut être défini via cet endpoint' });
        }

        // Ownership
        const q = await pool.query(
            `select ticket_status, odo_start, odo_end, description
            from tickets
            where id=$1 and tech_id=$2`,
            [id, req.user.sub]
        );
        if (!q.rowCount) return res.status(404).json({ error: 'not found' });

        const currentTicket = q.rows[0];

        // Validation du workflow et des prérequis
        const validation = await validateTicketCompletion(pool, id);
        if (!validation.valid) {
            return res.status(409).json({ 
                error: validation.error,
                missing: validation.missing 
            });
        }

        // Mettre à jour le ticket avec COMPLETED et la description
        const upd = await pool.query(
            `update tickets
            set ticket_status = 'COMPLETED',
                description = coalesce($1, description)
            where id = $2
            returning id, client_name, site_name, site_address,
                    ticket_status as status, purpose, created_at as "createdAt",
                    odo_start, odo_end, description`,
            [description ?? null, id]
        );

        res.json(upd.rows[0]);
    } catch (e) {
        console.error("complete ticket error:", e);
        res.status(500).json({ error: "fail_complete_ticket" });
    }
});
```

### 5. Mettre à jour GET /tickets/:id pour inclure l'état du workflow

Dans la fonction GET /tickets/:id (ligne ~963), s'assurer que ticket_status est retourné :

```javascript
// Le code existant devrait déjà retourner ticket_status, vérifiez juste qu'il est présent
```

## Notes importantes

1. **Migration SQL** : Exécutez d'abord `sql/migration_workflow_states.sql` avant de déployer ces changements
2. **Rétrocompatibilité** : Les anciens tickets avec 'draft', 'en_cours', 'clos' seront convertis automatiquement
3. **Validation stricte** : Le workflow empêche maintenant de sauter des étapes
