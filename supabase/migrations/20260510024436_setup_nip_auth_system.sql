/*
  # NIP-Based Authentication System

  Creates a custom auth system using NIP (text) instead of email.
  Bypasses Supabase Auth for simpler NIP/password login.

  Tables:
  - profiles: User profile with NIP as unique identifier
  
  Functions:
  - register_user: Create new user with NIP, name, password
  - login_user: Verify NIP and password, return user info
*/

-- ========================
-- DROP EXISTING TABLES
-- ========================
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ========================
-- PROFILES TABLE (Auth + User Info)
-- ========================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nip text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public read profiles (for display)
CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- ========================
-- DOCUMENTS TABLE
-- ========================
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  author text NOT NULL CHECK (char_length(author) BETWEEN 1 AND 300),
  tag text NOT NULL CHECK (tag IN ('Karantina Hewan', 'Karantina Ikan', 'Karantina Tumbuhan')),
  type text NOT NULL DEFAULT 'Jurnal' CHECK (type IN ('Jurnal', 'Laporan Uji Terap')),
  url text NOT NULL DEFAULT '',
  storage_path text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  size text DEFAULT '',
  download_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Public read documents
CREATE POLICY "Anyone can read documents"
  ON public.documents FOR SELECT
  USING (true);

-- Admins insert
CREATE POLICY "Admins can insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role = 'admin'
    )
  );

-- Admins update
CREATE POLICY "Admins can update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role = 'admin'
    )
  );

-- Admins delete
CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = auth.uid()::text AND p.role = 'admin'
    )
  );

-- ========================
-- INDEXES
-- ========================
CREATE INDEX idx_profiles_nip ON public.profiles(nip);
CREATE INDEX idx_documents_tag ON public.documents(tag);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);

-- ========================
-- AUTO-UPDATE TRIGGER
-- ========================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_docs ON public.documents;
CREATE TRIGGER set_updated_at_docs
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ========================
-- AUTH FUNCTIONS
-- ========================

-- Register user with NIP and password
CREATE OR REPLACE FUNCTION public.register_user(
  p_nip text,
  p_name text,
  p_password text
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_password_hash text;
BEGIN
  -- Check if NIP exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE nip = p_nip) THEN
    RETURN jsonb_build_object('error', 'NIP sudah terdaftar');
  END IF;

  -- Validate input
  IF p_nip IS NULL OR p_nip = '' THEN
    RETURN jsonb_build_object('error', 'NIP tidak boleh kosong');
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RETURN jsonb_build_object('error', 'Password minimal 6 karakter');
  END IF;
  IF p_name IS NULL OR p_name = '' THEN
    RETURN jsonb_build_object('error', 'Nama tidak boleh kosong');
  END IF;

  -- Hash password using pgcrypto
  v_password_hash := crypt(p_password, gen_salt('bf'));

  -- Create user
  INSERT INTO public.profiles (nip, name, password_hash, role)
  VALUES (p_nip, p_name, v_password_hash, 'user')
  RETURNING id INTO v_user_id;

  -- Create anonymous auth user for RLS
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    role, aud
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'user_' || v_user_id::text || '@internal',
    v_password_hash,
    now(), now(), now(),
    'authenticated', 'authenticated'
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'nip', p_nip,
    'name', p_name,
    'role', 'user'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Login user with NIP and password
CREATE OR REPLACE FUNCTION public.login_user(
  p_nip text,
  p_password text
)
RETURNS jsonb AS $$
DECLARE
  v_user record;
  v_password_match boolean;
BEGIN
  -- Find user by NIP
  SELECT id, nip, name, role, password_hash
  INTO v_user
  FROM public.profiles
  WHERE nip = p_nip
  LIMIT 1;

  -- Check if user exists
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('error', 'NIP atau password salah');
  END IF;

  -- Verify password
  v_password_match := (v_user.password_hash = crypt(p_password, v_user.password_hash));

  IF NOT v_password_match THEN
    RETURN jsonb_build_object('error', 'NIP atau password salah');
  END IF;

  -- Return user info
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user.id,
    'nip', v_user.nip,
    'name', v_user.name,
    'role', v_user.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment download count
CREATE OR REPLACE FUNCTION public.increment_download_count(doc_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.documents
  SET download_count = download_count + 1
  WHERE id = doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
