-- Migration pour ajouter la colonne d'image du numéro de série pour les pièces
-- serial_number_image : image du numéro de série de la pièce (installée ou retirée)

DO $$ 
BEGIN
    -- Image du numéro de série
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ticket_parts' AND column_name='serial_number_image') THEN
        ALTER TABLE ticket_parts ADD COLUMN serial_number_image text;
    END IF;
END $$;
