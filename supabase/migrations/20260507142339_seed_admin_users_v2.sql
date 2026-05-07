/*
  # Seed Admin Users (v2)

  ## Changes
  Creates two built-in admin accounts in Supabase Auth and links them to
  the profiles table with role='admin'.

  ## Admin Accounts
  1. NIP: admin / Password: admin123
  2. NIP: humas_buttmkhit / Password: humas_buttmkhit2024

  ## Notes
  - Uses SELECT to check existence before inserting to avoid conflict errors
*/

DO $$
DECLARE
  admin_uid uuid;
  humas_uid uuid;
BEGIN
  -- Check if admin user exists
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'admin@buttmkhit.local';

  IF admin_uid IS NULL THEN
    admin_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, role, aud
    ) VALUES (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'admin@buttmkhit.local',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Administrator","nip":"admin","role":"admin"}',
      now(), now(), 'authenticated', 'authenticated'
    );
  END IF;

  -- Upsert admin profile
  INSERT INTO public.profiles (id, nip, name, role)
  VALUES (admin_uid, 'admin', 'Administrator', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'Administrator', nip = 'admin';

  -- Check if humas user exists
  SELECT id INTO humas_uid FROM auth.users WHERE email = 'humas_buttmkhit@buttmkhit.local';

  IF humas_uid IS NULL THEN
    humas_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, role, aud
    ) VALUES (
      humas_uid,
      '00000000-0000-0000-0000-000000000000',
      'humas_buttmkhit@buttmkhit.local',
      crypt('humas_buttmkhit2024', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Humas BUTTMKHIT","nip":"humas_buttmkhit","role":"admin"}',
      now(), now(), 'authenticated', 'authenticated'
    );
  END IF;

  -- Upsert humas profile
  INSERT INTO public.profiles (id, nip, name, role)
  VALUES (humas_uid, 'humas_buttmkhit', 'Humas BUTTMKHIT', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'Humas BUTTMKHIT', nip = 'humas_buttmkhit';

END $$;
