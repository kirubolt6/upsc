/*
  # Complete Authentication System Fix

  1. Database Schema
    - Fix all tables and relationships
    - Proper RLS policies
    - Required triggers and functions
  
  2. Authentication Flow
    - User registration and login
    - Profile management
    - Session handling
  
  3. Security
    - Proper RLS policies
    - Admin and student access controls
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Ensure auth.uid() function works properly
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

-- Create or update profiles table with proper structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create or update users table (for compatibility)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  role user_role DEFAULT 'student',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure subjects table has proper structure
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Ensure modules table has proper structure  
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Fix questions table structure to match code
DO $$
BEGIN
  -- Check if old structure exists and migrate
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'options') THEN
    -- Add new columns
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_a text;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_b text;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_c text;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_d text;
    
    -- Migrate data if needed (this is a simplified migration)
    UPDATE questions SET 
      option_a = COALESCE(options[1], ''),
      option_b = COALESCE(options[2], ''),
      option_c = COALESCE(options[3], ''),
      option_d = COALESCE(options[4], '')
    WHERE option_a IS NULL;
    
    -- Drop old column
    ALTER TABLE questions DROP COLUMN IF EXISTS options;
  ELSE
    -- Add columns if they don't exist
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_a text NOT NULL DEFAULT '';
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_b text NOT NULL DEFAULT '';
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_c text NOT NULL DEFAULT '';
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_d text NOT NULL DEFAULT '';
  END IF;
  
  -- Ensure correct_answer column has proper type
  ALTER TABLE questions ALTER COLUMN correct_answer TYPE text;
END $$;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_section_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Anyone can insert profiles during signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for users table (compatibility)
CREATE POLICY "Anyone can insert users during signup"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own user record"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own user record"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create RLS policies for subjects
CREATE POLICY "Everyone can read active subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage all subjects"
  ON subjects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for modules
CREATE POLICY "Everyone can read active modules"
  ON modules FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage all modules"
  ON modules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for sections
CREATE POLICY "Everyone can read sections"
  ON sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage all sections"
  ON sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for questions
CREATE POLICY "Everyone can read questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage all questions"
  ON questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for progress tables
CREATE POLICY "Users can manage own progress"
  ON progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all progress"
  ON progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can manage own user_progress"
  ON user_progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own section progress"
  ON user_section_progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  
  -- Also insert into users table for compatibility
  INSERT INTO users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')::user_role
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update user progress
CREATE OR REPLACE FUNCTION update_user_progress()
RETURNS TRIGGER AS $$
DECLARE
  subject_uuid uuid;
  total_sections_count integer;
  completed_sections_count integer;
BEGIN
  -- Get subject_id from the section
  SELECT s.subject_id INTO subject_uuid
  FROM sections sec
  JOIN modules m ON sec.module_id = m.id
  JOIN subjects s ON m.subject_id = s.id
  WHERE sec.id = NEW.section_id;
  
  -- Count total sections for this subject
  SELECT COUNT(*) INTO total_sections_count
  FROM sections sec
  JOIN modules m ON sec.module_id = m.id
  WHERE m.subject_id = subject_uuid;
  
  -- Count completed sections for this user and subject
  SELECT COUNT(*) INTO completed_sections_count
  FROM user_section_progress usp
  JOIN sections sec ON usp.section_id = sec.id
  JOIN modules m ON sec.module_id = m.id
  WHERE m.subject_id = subject_uuid 
    AND usp.user_id = NEW.user_id 
    AND usp.is_completed = true;
  
  -- Update or insert user progress
  INSERT INTO user_progress (user_id, subject_id, total_sections, completed_sections, last_accessed)
  VALUES (NEW.user_id, subject_uuid, total_sections_count, completed_sections_count, now())
  ON CONFLICT (user_id, subject_id)
  DO UPDATE SET
    total_sections = total_sections_count,
    completed_sections = completed_sections_count,
    last_accessed = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for progress updates
DROP TRIGGER IF EXISTS trigger_update_user_progress ON user_section_progress;
CREATE TRIGGER trigger_update_user_progress
  AFTER INSERT OR UPDATE ON user_section_progress
  FOR EACH ROW EXECUTE FUNCTION update_user_progress();