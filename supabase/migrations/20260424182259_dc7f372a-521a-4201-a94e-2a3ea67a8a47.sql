-- 1. Add approval_status column
DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status public.approval_status NOT NULL DEFAULT 'pending';

-- 2. Approve all existing accounts (so current users aren't locked out)
UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status = 'pending';

-- 3. Update handle_new_user trigger to set pending; auto-approve admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'pending'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- 4. Allow admins to UPDATE any profile (currently only owner can update)
DROP POLICY IF EXISTS "admin can update any profile" ON public.profiles;
CREATE POLICY "admin can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));