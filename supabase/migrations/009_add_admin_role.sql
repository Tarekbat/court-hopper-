-- Add is_admin column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin) WHERE is_admin = true;

-- Set tarekbatrouny@gmail.com as admin
UPDATE public.users 
SET is_admin = true 
WHERE email = 'tarekbatrouny@gmail.com';

