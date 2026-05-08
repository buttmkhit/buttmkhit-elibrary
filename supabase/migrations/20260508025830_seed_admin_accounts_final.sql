/*
  # Seed Admin Accounts (Final)

  Creates admin accounts in Supabase Auth.
  
  Admin 1: admin@buttmkhit.local / admin123
  Admin 2: humas_buttmkhit@buttmkhit.local / humas_buttmkhit2024
*/

DO $$
DECLARE
  admin_id uuid;
  humas_id uuid;
BEGIN
  -- Admin user
  admin_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    role, aud, is_super_admin,
    raw_user_meta_data
  ) VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@buttmkhit.local',
    crypt('admin123', gen_salt('bf')),
    now(), now(), now(),
    'authenticated', 'authenticated', false,
    '{"name":"Administrator","nip":"admin"}'::jsonb
  );

  -- Humas user
  humas_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    role, aud, is_super_admin,
    raw_user_meta_data
  ) VALUES (
    humas_id,
    '00000000-0000-0000-0000-000000000000',
    'humas_buttmkhit@buttmkhit.local',
    crypt('humas_buttmkhit2024', gen_salt('bf')),
    now(), now(), now(),
    'authenticated', 'authenticated', false,
    '{"name":"Humas BUTTMKHIT","nip":"humas_buttmkhit"}'::jsonb
  );

END $$;
