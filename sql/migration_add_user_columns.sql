-- Migration pour ajouter les colonnes manquantes
-- Exécutez ce script si vous obtenez des erreurs de colonnes manquantes

-- ============================================
-- TABLE USERS
-- ============================================
DO $$ 
BEGIN
    -- first_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='first_name') THEN
        ALTER TABLE users ADD COLUMN first_name text;
    END IF;

    -- last_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='last_name') THEN
        ALTER TABLE users ADD COLUMN last_name text;
    END IF;

    -- is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='is_active') THEN
        ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;
    END IF;

    -- must_change_password
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='must_change_password') THEN
        ALTER TABLE users ADD COLUMN must_change_password boolean DEFAULT false;
    END IF;

    -- token_version
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='token_version') THEN
        ALTER TABLE users ADD COLUMN token_version integer DEFAULT 0;
    END IF;

    -- password_changed_at (utilisé dans change-password)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='password_changed_at') THEN
        ALTER TABLE users ADD COLUMN password_changed_at timestamptz;
    END IF;

    -- Mettre à jour les valeurs par défaut pour les utilisateurs existants
    UPDATE users SET is_active = true WHERE is_active IS NULL;
    UPDATE users SET must_change_password = false WHERE must_change_password IS NULL;
    UPDATE users SET token_version = 0 WHERE token_version IS NULL;
END $$;

-- ============================================
-- TABLE TICKETS
-- ============================================
DO $$ 
BEGIN
    -- odo_start (odomètre de départ)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tickets' AND column_name='odo_start') THEN
        ALTER TABLE tickets ADD COLUMN odo_start integer;
    END IF;

    -- odo_end (odomètre d'arrivée)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tickets' AND column_name='odo_end') THEN
        ALTER TABLE tickets ADD COLUMN odo_end integer;
    END IF;

    -- description (description du travail effectué)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tickets' AND column_name='description') THEN
        ALTER TABLE tickets ADD COLUMN description text;
    END IF;
END $$;

-- ============================================
-- TABLE TICKET_PARTS
-- ============================================
-- Mettre à jour la contrainte CHECK pour permettre 'broken' et 'none'
DO $$ 
BEGIN
    -- Supprimer l'ancienne contrainte si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name='ticket_parts' 
               AND constraint_name='ticket_parts_part_action_check') THEN
        ALTER TABLE ticket_parts DROP CONSTRAINT ticket_parts_part_action_check;
    END IF;
    
    -- Ajouter la nouvelle contrainte avec 'broken' et 'none'
    ALTER TABLE ticket_parts 
    ADD CONSTRAINT ticket_parts_part_action_check 
    CHECK (part_action IN ('installed', 'replaced', 'broken', 'none'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Mettre à jour la contrainte CHECK pour part_state pour permettre 'broken'
DO $$ 
BEGIN
    -- Supprimer l'ancienne contrainte si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name='ticket_parts' 
               AND constraint_name='ticket_parts_part_state_check') THEN
        ALTER TABLE ticket_parts DROP CONSTRAINT ticket_parts_part_state_check;
    END IF;
    
    -- Ajouter la nouvelle contrainte avec 'broken'
    ALTER TABLE ticket_parts 
    ADD CONSTRAINT ticket_parts_part_state_check 
    CHECK (part_state IN ('new', 'used', 'broken', 'DOA'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TABLE TICKET_CONSUMABLES (si elle n'existe pas)
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_consumables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    consumable_name text NOT NULL,
    qty numeric(10,2),
    unit text NOT NULL DEFAULT 'unit',
    created_at timestamptz DEFAULT now(),
    UNIQUE (ticket_id, consumable_name, unit)
);

-- ============================================
-- MISE À JOUR CONTRAINTE ROLE DANS USERS
-- ============================================
DO $$ 
BEGIN
    -- Supprimer l'ancienne contrainte si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name='users' 
               AND constraint_name='users_role_check') THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
    
    -- Ajouter la nouvelle contrainte avec 'team_lead'
    ALTER TABLE users 
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('tech', 'team_lead', 'manager', 'admin'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- VÉRIFICATIONS
-- ============================================
SELECT 'users' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

SELECT 'tickets' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tickets'
ORDER BY ordinal_position;
