/*
  # Fix RLS Policies and Database Integration Issues

  1. Database Schema Updates
    - Fix RLS policies for all tables
    - Ensure proper foreign key relationships
    - Add missing columns and constraints
    - Update trigger functions

  2. Security Policies
    - Fix profiles table policies
    - Ensure proper user access controls
    - Add admin-specific policies
    - Fix cascade relationships

  3. Data Integrity
    - Add proper constraints
    - Fix column types and defaults
    - Ensure referential integrity
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Fix profiles table structure
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'student'));

-- Ensure is_active column exists in subjects and modules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE subjects ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modules' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE modules ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Ensure created_by column exists in subjects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE subjects ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Fix questions table structure to match the code
DO $$
BEGIN
  -- Check if we need to restructure questions table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'options'
  ) THEN
    -- Drop the old structure and recreate
    DROP TABLE IF EXISTS questions CASCADE;
    
    CREATE TABLE questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      question_text text NOT NULL,
      option_a text NOT NULL,
      option_b text NOT NULL,
      option_c text NOT NULL,
      option_d text NOT NULL,
      correct_answer text NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
      explanation text,
      order_index integer DEFAULT 1,
      created_at timestamptz DEFAULT now()
    );
    
    CREATE INDEX idx_questions_section ON questions(section_id);
    ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create or replace the auth.uid() function if it doesn't exist
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- Fix profiles RLS policies
CREATE POLICY "Users can insert own profile during signup"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fix users table policies (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    CREATE POLICY "Users can insert own record during signup"
      ON users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);

    CREATE POLICY "Users can read own record"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);

    CREATE POLICY "Users can update own record"
      ON users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Fix subjects policies
DROP POLICY IF EXISTS "Anyone can read subjects" ON subjects;
DROP POLICY IF EXISTS "Everyone can read subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;
DROP POLICY IF EXISTS "Only admins can manage subjects" ON subjects;

CREATE POLICY "Everyone can read active subjects"
  ON subjects
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage all subjects"
  ON subjects
  FOR ALL
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

-- Fix modules policies
DROP POLICY IF EXISTS "Anyone can read modules" ON modules;
DROP POLICY IF EXISTS "Everyone can read modules" ON modules;
DROP POLICY IF EXISTS "Admins can manage modules" ON modules;
DROP POLICY IF EXISTS "Only admins can manage modules" ON modules;

CREATE POLICY "Everyone can read active modules"
  ON modules
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage all modules"
  ON modules
  FOR ALL
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

-- Fix sections policies
DROP POLICY IF EXISTS "Anyone can read sections" ON sections;
DROP POLICY IF EXISTS "Everyone can read sections" ON sections;
DROP POLICY IF EXISTS "Admins can manage sections" ON sections;
DROP POLICY IF EXISTS "Only admins can manage sections" ON sections;

CREATE POLICY "Everyone can read sections"
  ON sections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage all sections"
  ON sections
  FOR ALL
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

-- Fix questions policies
CREATE POLICY "Everyone can read questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage all questions"
  ON questions
  FOR ALL
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

-- Fix progress tables policies
DROP POLICY IF EXISTS "Users can read own progress" ON progress;
DROP POLICY IF EXISTS "Users can manage own progress" ON progress;
DROP POLICY IF EXISTS "Admins can read all progress" ON progress;

-- For progress table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'progress') THEN
    CREATE POLICY "Users can manage own progress"
      ON progress
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "Admins can read all progress"
      ON progress
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Fix user_progress policies
DROP POLICY IF EXISTS "Users can read own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can manage own progress" ON user_progress;

CREATE POLICY "Users can manage own user_progress"
  ON user_progress
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all user_progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fix user_section_progress policies
DROP POLICY IF EXISTS "Users can read own section progress" ON user_section_progress;
DROP POLICY IF EXISTS "Users can manage own section progress" ON user_section_progress;

CREATE POLICY "Users can manage own section progress"
  ON user_section_progress
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all section progress"
  ON user_section_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create or replace the update_user_progress function
CREATE OR REPLACE FUNCTION update_user_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_progress table when section progress changes
  INSERT INTO user_progress (user_id, subject_id, total_sections, completed_sections, last_accessed)
  SELECT 
    NEW.user_id,
    s.subject_id,
    COUNT(sec.id) as total_sections,
    COUNT(CASE WHEN usp.is_completed = true THEN 1 END) as completed_sections,
    now() as last_accessed
  FROM sections sec
  JOIN modules m ON sec.module_id = m.id
  JOIN subjects s ON m.subject_id = s.id
  LEFT JOIN user_section_progress usp ON sec.id = usp.section_id AND usp.user_id = NEW.user_id
  WHERE s.subject_id = (
    SELECT s2.subject_id 
    FROM sections sec2
    JOIN modules m2 ON sec2.module_id = m2.id
    JOIN subjects s2 ON m2.subject_id = s2.id
    WHERE sec2.id = NEW.section_id
  )
  GROUP BY NEW.user_id, s.subject_id
  ON CONFLICT (user_id, subject_id)
  DO UPDATE SET
    total_sections = EXCLUDED.total_sections,
    completed_sections = EXCLUDED.completed_sections,
    last_accessed = EXCLUDED.last_accessed;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_update_user_progress ON user_section_progress;
CREATE TRIGGER trigger_update_user_progress
  AFTER INSERT OR UPDATE ON user_section_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progress();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;