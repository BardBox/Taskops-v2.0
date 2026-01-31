-- Add client_code column if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients'
        AND column_name = 'client_code'
) THEN
ALTER TABLE public.clients
ADD COLUMN client_code TEXT;
CREATE INDEX idx_clients_client_code ON public.clients(client_code);
END IF;
END $$;
-- Drop function if exists to ensure clean slate (optional, but safer for updates)
DROP FUNCTION IF EXISTS public.generate_client_code();
-- Create or Replace the generate_client_code function
CREATE OR REPLACE FUNCTION public.generate_client_code() RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE next_code TEXT;
last_code TEXT;
code_num INT;
BEGIN -- Get the last client code (assuming format CLT-001)
SELECT client_code INTO last_code
FROM public.clients
WHERE client_code LIKE 'CLT-%'
ORDER BY client_code DESC
LIMIT 1;
IF last_code IS NULL THEN next_code := 'CLT-001';
ELSE code_num := CAST(
    SUBSTRING(
        last_code
        FROM 5
    ) AS INT
) + 1;
next_code := 'CLT-' || LPAD(code_num::TEXT, 3, '0');
END IF;
RETURN next_code;
END;
$$;
-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_client_code TO authenticated;