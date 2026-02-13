require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const app = express();

// CORS pour le dev local (Vite sur :5173)
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

//app.use(cors());
app.use(express.json());
app.use(cookieParser()); // pour mettre le refresh en cookie httpOnly


//  créer le pool AVANT les routes
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Gestion des erreurs de connexion
pool.on('error', (err) => {
    console.error('Erreur de connexion PostgreSQL:', err);
});

// Test de connexion au démarrage
pool.query('SELECT NOW()')
    .then(() => {
        console.log('✓ Connexion à la base de données réussie');
    })
    .catch((err) => {
        console.error('✗ Erreur de connexion à la base de données:', err.message);
        console.error('Vérifiez que:');
        console.error('  1. PostgreSQL est en cours d\'exécution');
        console.error('  2. La base de données "db_network" existe');
        console.error('  3. Les identifiants dans .env sont corrects');
        console.error('  4. DATABASE_URL=' + process.env.DATABASE_URL);
    });

// petit healthcheck
app.get('/', (_req, res) => res.send('API OK'));

function signAccess(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '15m' });
}
function signRefresh(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.REFRESH_EXPIRES || '30d' });
}

// REGISTER (juste pour tests; en prod on limitera à l’admin)
app.post('/auth/register', async (req, res) => {
    try {
    const { email, password, role = 'tech' } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'email/password requis' });
    }

    const hash = await bcrypt.hash(password, 12);

    const { rows, rowCount } = await pool.query(
        `insert into users(email, password_hash, role)
        values ($1,$2,$3)
        on conflict (email) do nothing
        returning id, email, role`,
        [email.toLowerCase(), hash, role]
    );

    if (!rowCount) {
        return res.status(409).json({ error: 'email déjà utilisé' });
    }

    res.json(rows[0]);
    }
    catch (err) {
        console.error('register error:', err);
        res.status(500).json({ error: 'fail_create_user' });
    }
});


// LOGIN
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};

        const q = await pool.query(
        `select
            id,
            email,
            role,
            password_hash,
            first_name,
            last_name,
            coalesce(is_active,true) as is_active
        from users
        where email = $1`,
        [email?.toLowerCase()]
        );

        const u = q.rows[0];
        if (!u || !u.is_active) {
        return res.status(401).json({ error: 'invalid credentials' });
        }

        const ok = await bcrypt.compare(password || '', u.password_hash || '');
        if (!ok) {
        return res.status(401).json({ error: 'invalid credentials' });
        }

        const access = jwt.sign(
        { sub: u.id, role: u.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES || '15m' }
        );
        const refresh = jwt.sign(
        { sub: u.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.REFRESH_EXPIRES || '30d' }
        );

        res.cookie('refresh', refresh, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 30,
        });

        // renvoyer aussi user info si besoin
        res.json({
        access,
        user: {
            id: u.id,
            email: u.email,
            role: u.role,
            first_name: u.first_name,
            last_name: u.last_name,
        },
        });
    } catch (err) {
        console.error('login error:', err);
        res.status(500).json({ error: 'fail_login' });
    }
});



// LOGOUT
app.post('/auth/logout', (req, res) => {
    res.clearCookie('refresh');
    res.json({ ok:true });
});

// Middlewares de protection

function requireAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error:'no token' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    }
    catch {
        return res.status(401).json({ error:'invalid token' });
    }
}

// hiérarchie des rôles
const ROLE_LEVEL = {
    tech: 1,
    manager: 2,
    admin: 3,
};

// requireRole('tech') => min tech (tech + manager + admin)
// requireRole('manager') => min manager (manager + admin)
// requireRole('admin') => admin seulement
function requireRole(minRole) {
    const minLevel = ROLE_LEVEL[minRole] || Infinity;
    return (req, res, next) => {
        const userRole = req.user?.role;
        const userLevel = ROLE_LEVEL[userRole] || 0;
        if (userLevel < minLevel) {
        return res.status(403).json({ error: 'forbidden' });
        }
        next();
    };
}

// ---------- Endpoints ----------

// -- ADMIN Endpoints ---
// lister les users
app.get('/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
    const { rows } = await pool.query(
        `select id, email, role, created_at, coalesce(is_active,true) as is_active  from users order by created_at desc`
    );
    res.json(rows);
});

// Créer un utilisateur (admin) – le tech recevra un mot de passe provisoire
app.post('/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
    const { email, password, role = 'tech' } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'email et password requis' });
    }
    if (!['tech','manager','admin'].includes(role)) {
        return res.status(400).json({ error: 'role invalide' });
    }

    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query(
        `insert into users(email, password_hash, role)
        values ($1,$2,$3)
        on conflict (email) do nothing
        returning id, email, role, created_at`,
        [email.toLowerCase(), hash, role]
    );
    if (!r.rowCount) {
        return res.status(409).json({ error: 'email déjà utilisé' });
    }
    res.status(201).json(r.rows[0]);
});

// Modifier rôle / activation (admin)
app.patch('/admin/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { role, is_active } = req.body || {};

    if (role && !['tech','manager','admin'].includes(role)) {
        return res.status(400).json({ error: 'role invalide' });
    }

    const r = await pool.query(
        `update users
            set role = coalesce($1, role),
                is_active = coalesce($2, is_active)
        where id = $3
        returning id, email, role, coalesce(is_active,true) as is_active, created_at`,
        [role || null, typeof is_active === 'boolean' ? is_active : null, id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'user not found' });
    res.json(r.rows[0]);
});



// --- MANAGER Endpoints ---
// Lister tous les tickets avec filtres optionnels: par tech, statut, dates
// query possible : status, tech_id, q, from, to, limit, offset
app.get('/manager/tickets', requireAuth, requireRole('manager'), async (req, res) => {
    try {
        let { status, tech_id, q, from, to, limit = '50', offset = '0' } = req.query;

        const conds = [];
        const params = [];
        let i = 1;

        if (status && status !== 'all') {
        conds.push(`t.ticket_status = $${i}`);
        params.push(status);
        i++;
        }

        if (tech_id) {
        conds.push(`t.tech_id = $${i}`);
        params.push(tech_id);
        i++;
        }

        if (from) {
        conds.push(`t.created_at >= $${i}`);
        params.push(from);
        i++;
        }

        if (to) {
        conds.push(`t.created_at <= $${i}`);
        params.push(to);
        i++;
        }

        if (q) {
        conds.push(`(t.client_name ilike $${i} or t.site_name ilike $${i})`);
        params.push(`%${q}%`);
        i++;
        }

        const where = conds.length ? 'where ' + conds.join(' and ') : '';

        limit = Math.min(parseInt(limit, 10) || 50, 100);
        offset = Math.max(parseInt(offset, 10) || 0, 0);
        params.push(limit, offset);

        const { rows } = await pool.query(
        `
        select
            t.id,
            t.client_name,
            t.site_name,
            t.site_address,
            t.ticket_status as status,
            t.purpose,
            t.created_at as "createdAt",
            t.odo_start,
            t.odo_end,
            u.id   as tech_id,
            u.email as tech_email
        from tickets t
        join users u on u.id = t.tech_id
        ${where}
        order by t.created_at desc
        limit $${i} offset $${i + 1}
        `,
        params
        );

        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'fail_manager_list_tickets' });
    }
});

// Détail d’un ticket pour le manager
// retourne ticket + timestamps + pièces (+ éventuellement dépenses plus tard)
app.get('/manager/tickets/:id', requireAuth, requireRole('manager'), async (req, res) => {
    const { id } = req.params;

    try {
        const t = await pool.query(
        `select
            t.id,
            t.client_name,
            t.site_name,
            t.site_address,
            t.ticket_status as status,
            t.purpose,
            t.created_at as "createdAt",
            t.odo_start,
            t.odo_end,
            u.id   as tech_id,
            u.email as tech_email,
            u.role as tech_role
        from tickets t
        join users u on t.tech_id = u.id
        where t.id = $1`,
        [id]
        );
        if (!t.rowCount) return res.status(404).json({ error: 'not found' });

        // timestamps
        const timestamps = await pool.query(
        `select punch_type, ts
            from ticket_timestamps
            where ticket_id = $1
            order by ts asc`,
        [id]
        );

        // parts
        const parts = await pool.query(
        `select
            id,
            part_action,
            part_name,
            serial_number,
            part_state,
            created_at
        from ticket_parts
        where ticket_id = $1
        order by created_at asc`,
        [id]
        );

        // consumables
        const cons = await pool.query(
            `select id, consumable_name, qty, unit, created_at
            from ticket_consumables
            where ticket_id=$1
            order by created_at asc`,
            [id]
        );

        // plus tard: expenses, tools_used...

        res.json({
        ticket: t.rows[0],
        timestamps: timestamps.rows,
        parts: parts.rows,
        consumables: cons.rows,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'fail_manager_ticket_detail' });
    }
});


// Liste des techs (inclut les managers si voulu)
app.get('/manager/techs', requireAuth, requireRole('manager'), async (req, res) => {
    const { rows } = await pool.query(
        `select u.id, u.email, u.role, u.is_active,
                p.hourly_rate, p.km_rate, p.notes
        from users u
        left join tech_profiles p on p.user_id = u.id
        where u.role in ('tech','manager')
        order by u.email`
    );
    res.json(rows);
});


// Détail d’un tech + ses tickets (pour le manager)
app.get('/manager/techs/:id', requireAuth, requireRole('manager'), async (req, res) => {
    const { id } = req.params;

    const userQ = await pool.query(
        `select u.id, u.email, u.role, u.is_active,
                p.hourly_rate, p.km_rate, p.notes
        from users u
        left join tech_profiles p on p.user_id = u.id
        where u.id = $1 and u.role in ('tech','manager')`,
        [id]
    );
    if (!userQ.rowCount) return res.status(404).json({ error: 'not found' });

    const assetsQ = await pool.query(
        `select id, asset_name, serial_number, active, created_at
        from tech_assets
        where tech_id = $1
        order by created_at desc`,
        [id]
    );

    const certsQ = await pool.query(
        `select id, cert_name, expires_on, created_at
        from tech_certifications
        where tech_id = $1
        order by expires_on nulls last, created_at desc`,
        [id]
    );

    res.json({
        tech: userQ.rows[0],
        assets: assetsQ.rows,
        certifications: certsQ.rows,
    });
});

// Créer / mettre à jour le profil (taux, km, notes)
app.put('/manager/techs/:id/profile', requireAuth, requireRole('manager'), async (req, res) => {
    const { id } = req.params;
    const { hourly_rate, km_rate, notes } = req.body || {};

    // garantir que l'utilisateur existe et est tech/manager
    const u = await pool.query(
        `select id from users where id=$1 and role in ('tech','manager')`,
        [id]
    );
    if (!u.rowCount) return res.status(404).json({ error: 'not found' });

    const q = await pool.query(
        `insert into tech_profiles(user_id, hourly_rate, km_rate, notes)
            values ($1,$2,$3,$4)
        on conflict (user_id) do update
            set hourly_rate = excluded.hourly_rate,
                km_rate    = excluded.km_rate,
                notes      = excluded.notes
        returning user_id, hourly_rate, km_rate, notes`,
        [id, hourly_rate ?? null, km_rate ?? null, notes ?? null]
    );
    res.json(q.rows[0]);
});

// Ajouter un équipement au technicien
app.post('/manager/techs/:id/assets', requireAuth, requireRole('manager'), async (req, res) => {
    const { id } = req.params;
    const { asset_name, serial_number } = req.body || {};
    if (!asset_name || !serial_number) {
        return res.status(400).json({ error: 'asset_name et serial_number requis' });
    }

    const u = await pool.query(
        `select id from users where id=$1 and role in ('tech','manager')`,
        [id]
    );
    if (!u.rowCount) return res.status(404).json({ error: 'not found' });

    const q = await pool.query(
        `insert into tech_assets(tech_id, asset_name, serial_number)
        values ($1,$2,$3)
        on conflict (tech_id, serial_number) do update
            set asset_name = excluded.asset_name,
                active     = true
        returning id, tech_id, asset_name, serial_number, active, created_at`,
        [id, asset_name, serial_number]
    );
    res.json(q.rows[0]);
});

// Désactiver / retirer un asset
app.patch('/manager/techs/:techId/assets/:assetId', requireAuth, requireRole('manager'), async (req, res) => {
    const { techId, assetId } = req.params;
    const { active } = req.body || {};
    const q = await pool.query(
        `update tech_assets
            set active = coalesce($1, active)
        where id=$2 and tech_id=$3
        returning id, tech_id, asset_name, serial_number, active, created_at`,
        [active ?? false, assetId, techId]
    );
    if (!q.rowCount) return res.status(404).json({ error: 'not found' });
    res.json(q.rows[0]);
});

// Ajouter un certificat
app.post('/manager/techs/:id/certifications', requireAuth, requireRole('manager'), async (req, res) => {
    const { id } = req.params;
    const { cert_name, expires_on } = req.body || {};
    if (!cert_name) return res.status(400).json({ error: 'cert_name requis' });

    const u = await pool.query(
        `select id from users where id=$1 and role in ('tech','manager')`,
        [id]
    );
    if (!u.rowCount) return res.status(404).json({ error: 'not found' });

    const q = await pool.query(
        `insert into tech_certifications(tech_id, cert_name, expires_on)
        values ($1,$2,$3)
        returning id, tech_id, cert_name, expires_on, created_at`,
        [id, cert_name, expires_on ?? null]
    );
    res.json(q.rows[0]);
});

// Modifier / mettre à jour une certification (date d’expiration par exemple)
app.patch('/manager/techs/:techId/certifications/:certId', requireAuth, requireRole('manager'), async (req, res) => {
    const { techId, certId } = req.params;
    const { cert_name, expires_on } = req.body || {};
    const q = await pool.query(
        `update tech_certifications
            set cert_name = coalesce($1, cert_name),
                expires_on = coalesce($2, expires_on)
        where id=$3 and tech_id=$4
        returning id, tech_id, cert_name, expires_on, created_at`,
        [cert_name ?? null, expires_on ?? null, certId, techId]
    );
    if (!q.rowCount) return res.status(404).json({ error: 'not found' });
    res.json(q.rows[0]);
});





// --- TECH Endpoints ---
// Créer un ticket
// body: { client_name, site_name, site_address, purpose }
app.post('/tickets', requireAuth, requireRole('tech'), async (req, res) => {
    try {
        const { client_name, site_name, site_address, purpose } = req.body || {};
        if (!client_name || !site_name || !site_address) {
        return res.status(400).json({ error: 'client_name, site_name, site_address requis' });
        }
        const { rows } = await pool.query(
        `insert into tickets(tech_id, client_name, site_name, site_address, ticket_status, purpose)
        values ($1,$2,$3,$4,'draft',$5)
        returning id, client_name, site_name, site_address,
            ticket_status as status, purpose, created_at as "createdAt"`,
        [req.user.sub, client_name, site_name, site_address, purpose ?? null]
        );
        res.json(rows[0]);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'fail_create_ticket' });
    }
});

// Lister MES tickets
app.get('/tickets', requireAuth, requireRole('tech'), async (req, res) => {
    try {
        const limit  = Math.min(parseInt(req.query.limit || '20', 10), 100);
        const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

        const { rows } = await pool.query(
            `select id, client_name, site_name, site_address,
                    ticket_status as status, purpose, created_at as "createdAt"
                from tickets
                where tech_id = $1
                order by created_at desc
                limit $2 offset $3`,
            [req.user.sub, limit, offset]
        );
        res.json(rows);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'fail_list_tickets' });
    }
});


// Punch (idempotent) sur un ticket
// body: { punch_type, ts? }  (ts optionnel, ISO string; défaut = now)
app.post('/tickets/:id/timestamps', requireAuth, requireRole('tech'), async (req, res) => {
    try {
        const { id } = req.params;
        const { punch_type, ts } = req.body || {};
        const allowed = ['leave_home','reach_wh','start_site','leave_site','back_wh','back_home'];
        if (!allowed.includes(punch_type)) {
        return res.status(400).json({ error: 'punch_type invalide' });
        }

        // ownership: le ticket doit appartenir au tech connecté
        const own = await pool.query(
        `select 1 from tickets where id=$1 and tech_id=$2`,
        [id, req.user.sub]
        );
        if (!own.rowCount) return res.status(403).json({ error: 'Not your ticket' });

        const when = ts ? new Date(ts).toISOString() : new Date().toISOString();

    // UPSERT du punch (idempotent)
        await pool.query(
            `insert into ticket_timestamps(ticket_id, punch_type, ts)
            values ($1,$2,$3)
            on conflict (ticket_id, punch_type) do update set ts = excluded.ts`,
            [id, punch_type, when]
            );

            // passer le ticket 'draft' -> 'en_cours' au premier punch
            await pool.query(
            `update tickets
                set ticket_status = 'en_cours'
                where id = $1 and ticket_status = 'draft'`,
            [id]
            );

        res.json({ ok: true, ticket_id: id, punch_type, ts: when });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'fail_punch' });
    }
});



// Détail d'un ticket + punches + pièces + consommables
app.get('/tickets/:id', requireAuth, requireRole('tech'), async (req, res) => {
    const { id } = req.params;

    // ticket (ownership)
    const t = await pool.query(
        `select id, client_name, site_name, site_address,
                ticket_status as status, purpose, created_at as "createdAt",
                odo_start, odo_end, description
        from tickets
        where id=$1 and tech_id=$2`,
        [id, req.user.sub]
    );
    if (!t.rowCount) return res.status(404).json({ error: 'not found' });

    // punches
    const p = await pool.query(
        `select punch_type, ts
        from ticket_timestamps
        where ticket_id=$1
        order by ts asc`,
        [id]
    );

    // parts
    const parts = await pool.query(
        `select id, part_action, part_name, serial_number, part_state, created_at
        from ticket_parts
        where ticket_id=$1
        order by created_at asc`,
        [id]
    );

    // consumables
    const cons = await pool.query(
        `select id, consumable_name, qty, unit, created_at
        from ticket_consumables
        where ticket_id=$1
        order by created_at asc`,
        [id]
    );

    res.json({
        ticket: t.rows[0],
        timestamps: p.rows,
        parts: parts.rows,
        consumables: cons.rows,
    });
});



// Punch (idempotent) sur un ticket
// body: { punch_type, ts? }  punch_type ∈ leave_home|reach_wh|start_site|leave_site|back_wh|back_home
app.post('/tickets/:id/odometer', requireAuth, requireRole('tech'), async (req, res) => {
    const { id } = req.params;
    const { odo_start, odo_end } = req.body || {};

    // ownership
    const own = await pool.query(
        `select 1 from tickets where id=$1 and tech_id=$2`,
        [id, req.user.sub]
    );
    if (!own.rowCount) return res.status(404).json({ error: 'not found' });

    // validations simples côté API (en plus des CHECK BD)
    if (odo_start != null && (!Number.isInteger(odo_start) || odo_start < 0))
        return res.status(400).json({ error: 'odo_start invalide' });
    if (odo_end != null && (!Number.isInteger(odo_end) || odo_end < 0))
        return res.status(400).json({ error: 'odo_end invalide' });
    if (odo_start != null && odo_end != null && odo_end < odo_start)
        return res.status(409).json({ error: 'odo_end < odo_start' });

    const upd = await pool.query(
        `update tickets
            set odo_start = coalesce($1, odo_start),
                odo_end   = coalesce($2, odo_end)
        where id=$3
        returning id, client_name, site_name, site_address,
                ticket_status as status, purpose, created_at as "createdAt",
                odo_start, odo_end`,
        [odo_start ?? null, odo_end ?? null, id]
    );
    res.json(upd.rows[0]);
});


app.patch('/tickets/:id/status', requireAuth, requireRole('tech'), async (req, res) => {
    const { id } = req.params;
    const { status, description } = req.body || {};   // <- on récupère aussi description
    const allowed = ['en_cours', 'clos'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'status invalide' });
    }

    // Lire le statut courant + odomètre
    const q = await pool.query(
        `select ticket_status, odo_start, odo_end
        from tickets
        where id=$1 and tech_id=$2`,
        [id, req.user.sub]
    );
    if (!q.rowCount) return res.status(404).json({ error: 'not found' });

    const { ticket_status: current, odo_start, odo_end } = q.rows[0];

    // description obligatoire pour 'clos'
    if (status === 'clos' && !description) {
        return res.status(409).json({ error: 'Impossible de clore: description obligatoire' });
    }

    // Règles de transition
    const okTransition =
        (current === 'draft'    && status === 'en_cours') ||
        (current === 'en_cours' && status === 'clos');
    if (!okTransition) {
        return res.status(409).json({ error: `transition interdite: ${current} -> ${status}` });
    }

    // si on veut clore, vérifier les prérequis
    if (status === 'clos') {
        // 1) odomètre complet
        if (odo_start == null || odo_end == null) {
            return res.status(409).json({ error: 'Impossible de clore: odomètre incomplet' });
        }

        // 2) timestamps requis (reach_wh, start_site, leave_site, back_wh)
        const needed = ['reach_wh','start_site','leave_site','back_wh'];
        const tsq = await pool.query(
            `select punch_type from ticket_timestamps
            where ticket_id=$1 and punch_type = any($2::text[])`,
            [id, needed]
        );
        const present = new Set(tsq.rows.map(r => r.punch_type));
        const missing = needed.filter(t => !present.has(t));
        if (missing.length) {
            return res.status(409).json({ error: `Impossible de clore: timestamps manquants (${missing.join(', ')})` });
        }

        // 3) pièces requises: au moins 1 installed et 1 replaced

        const pq = await pool.query(
        `select count(*)::int as n
        from ticket_parts
        where ticket_id=$1`,
        [id]
        );

        if (pq.rows[0].n === 0) {
        return res.status(409).json({ error: 'Impossible de clore: ajoutez une pièce ou "Aucune pièce"' });
        }


        /* const pq = await pool.query(
            `select part_action, count(*) from ticket_parts
            where ticket_id=$1 and part_action in ('installed','replaced')
            group by part_action`,
            [id]
        );
        const counts = Object.fromEntries(pq.rows.map(r => [r.part_action, Number(r.count)]));
        if (!counts.installed || !counts.replaced) {
            return res.status(409).json({
                error: 'Impossible de clore: il faut au moins une pièce "installed" (nouvelle) et une pièce "replaced" (ancienne).'
            });
        } */

    }

    const upd = await pool.query(
        `update tickets
            set ticket_status = $1,
                description   = coalesce($2, description)   -- <- bonne colonne
        where id = $3
        returning id, client_name, site_name, site_address,
                ticket_status as status, purpose, created_at as "createdAt",
                odo_start, odo_end, description`,
        [status, description ?? null, id]
    );
    res.json(upd.rows[0]);
});



// Endpoints parts

// Ajouter une pièce à un ticket
// body: { part_action, part_name, serial_number, part_state }
app.post('/tickets/:id/parts', requireAuth, requireRole('tech'), async (req, res) => {
    const { id } = req.params;
    const { part_action, part_name, serial_number, part_state } = req.body || {};

    // ownership
    const own = await pool.query(
        'select 1 from tickets where id=$1 and tech_id=$2',
        [id, req.user.sub]
    );
    if (!own.rowCount) return res.status(404).json({ error: 'not found' });

    // validations
    const actions = ['installed', 'replaced','broken', 'none'];
    const states  = ['new', 'used', 'broken', 'DOA'];

    if (!actions.includes(part_action)) {
        return res.status(400).json({ error: 'part_action invalide' });
    }

    // Cas "Aucune pièce"
    if (part_action === 'none') {
        try {
        const { rows } = await pool.query(
            `insert into ticket_parts(ticket_id, part_action, part_name, serial_number, part_state)
            values ($1,$2,$3,$4,$5)
            returning id, ticket_id, part_action, part_name, serial_number, part_state, created_at`,
            [id, 'none', 'Aucune pièce utilisée', null, null]
        );
        return res.json(rows[0]);
        } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'fail_add_part' });
        }
    }

    // Cas normal (installed / replaced)
    if (!states.includes(part_state)) {
        return res.status(400).json({ error: 'part_state invalide' });
    }
    if (!part_name?.trim()) {
        return res.status(400).json({ error: 'part_name requis' });
    }
    if (!serial_number?.trim()) {
        return res.status(400).json({ error: 'serial_number requis' });
    }

    // normaliser le SN pour éviter doublons "visuels"
    const sn = serial_number.trim().toUpperCase();

    try {
        const { rows } = await pool.query(
        `insert into ticket_parts(ticket_id, part_action, part_name, serial_number, part_state)
        values ($1,$2,$3,$4,$5)
        returning id, ticket_id, part_action, part_name, serial_number, part_state, created_at`,
        [id, part_action, part_name.trim(), sn, part_state]
        );
        res.json(rows[0]);
    } catch (e) {
        // violation de l’unique index -> doublon SN sur ce ticket
        if (e.code === '23505') {
        return res.status(409).json({ error: 'serial déjà saisi pour ce ticket' });
        }
        console.error(e);
        return res.status(500).json({ error: 'fail_add_part' });
    }
});

// Lister les pièces d’un ticket
app.get('/tickets/:id/parts', requireAuth, requireRole('tech'), async (req, res) => {
    const { id } = req.params;
    const own = await pool.query(`select 1 from tickets where id=$1 and tech_id=$2`, [id, req.user.sub]);
    if (!own.rowCount) return res.status(404).json({ error: 'not found' });

    const { rows } = await pool.query(
        `select id, part_action, part_name, serial_number, part_state, created_at
        from ticket_parts
        where ticket_id=$1
        order by created_at asc`,
        [id]
    );
    res.json(rows);
});

// Consommables
// body: { consumable_name, qty, unit }
app.post('/tickets/:id/consumables', requireAuth, requireRole('tech'), async (req, res) => {
    const { id } = req.params;
    const { consumable_name, qty, unit } = req.body || {};

    // ownership
    const own = await pool.query(
        'select 1 from tickets where id=$1 and tech_id=$2',
        [id, req.user.sub]
    );
    if (!own.rowCount) return res.status(404).json({ error: 'not found' });

    // validations
    const name = (consumable_name || '').trim();
    if (!name) return res.status(400).json({ error: 'consumable_name requis' });

    const cleanUnit = String(unit || 'unit').trim().toLowerCase();
    const allowedUnits = ['unit', 'box', 'pack', 'roll', 'm'];
    if (!allowedUnits.includes(cleanUnit)) {
        return res.status(400).json({ error: 'unit invalide' });
    }

    let qtyVal = null;
    if (qty !== undefined && qty !== null && String(qty).trim() !== '') {
        qtyVal = Number(qty);
        if (Number.isNaN(qtyVal) || qtyVal <= 0) {
        return res.status(400).json({ error: 'qty invalide (doit être > 0)' });
        }
    }

    try {
        const { rows } = await pool.query(
        `insert into ticket_consumables(ticket_id, consumable_name, qty, unit)
        values ($1,$2,$3,$4)
        returning id, ticket_id, consumable_name, qty, unit, created_at`,
        [id, name, qtyVal, cleanUnit]
        );
        res.json(rows[0]);
    } catch (e) {
        // unique index: doublon par ticket (name+unit)
        if (e.code === '23505') {
        return res.status(409).json({ error: 'consommable déjà saisi pour ce ticket' });
        }
        console.error(e);
        return res.status(500).json({ error: 'fail_add_consumable' });
    }
});






app.listen(process.env.PORT || 3000, () => {
    console.log('API listening on http://localhost:' + (process.env.PORT || 3000));
});

