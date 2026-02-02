-- Add phone_number field to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.users.phone_number IS 'User phone number for contact purposes';

