/*
  # BUTTMKHIT e-Library - Full Schema Setup

  ## Summary
  Creates the complete database schema for the e-library system, migrating from SQLite
  to PostgreSQL with full Row Level Security (RLS).

  ## New Tables

  ### 1. `profiles`
  Stores user profiles linked to Supabase Auth.
  - `id` (uuid): References auth.users
  - `nip` (text): National Identity Number / username
  - `name` (text): Display name
  - `role` (text): 'user' or 'admin'
  - `created_at` (timestamptz): Creation timestamp

  ### 2. `documents`
  Stores library documents (journals, reports).
  - `id` (uuid): Primary key
  - `title` (text): Document title
  - `author` (text): Author or institution
  - `tag` (text): Quarantine category (Karantina Hewan/Ikan/Tumbuhan)
  - `type` (text): Document type (Jurnal / Laporan Uji Terap)
  - `url` (text): Storage URL for PDF file
  - `storage_path` (text): Internal Supabase Storage path
  - `date` (date): Publication/upload date
  - `size` (text): File size display string
  - `download_count` (integer): Number of downloads
  - `created_by` (uuid): References auth.users
  - `created_at` (timestamptz): Creation timestamp
  - `updated_at` (timestamptz): Last updated timestamp

  ## Security
  - RLS enabled on all tables
  - Public can read documents
  - Only authenticated admin users can insert/update/delete documents
  - Users can read/update their own profile
  - Admin users can manage all profiles

  ## Indexes
  - Index on documents.tag for category filtering
  - Index on documents.created_at for sorting
  - Index on profiles.role for role checks
*/

-- ========================
-- PROFILES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nip text UNIQUE,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'user');

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ========================
-- DOCUMENTS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS documents (
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
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Public can read all documents
CREATE POLICY "Anyone can read documents"
  ON documents FOR SELECT
  USING (true);

-- Only admins can insert documents
CREATE POLICY "Admins can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Only admins can update documents
CREATE POLICY "Admins can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Only admins can delete documents
CREATE POLICY "Admins can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ========================
-- INDEXES
-- ========================
CREATE INDEX IF NOT EXISTS idx_documents_tag ON documents(tag);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents USING gin(to_tsvector('english', author));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ========================
-- AUTO-UPDATE updated_at
-- ========================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ========================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ========================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, nip, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'nip', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
