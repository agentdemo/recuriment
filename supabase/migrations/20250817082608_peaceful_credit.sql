/*
  # Create jobs and applications tables

  1. New Tables
    - `jobs`
      - `id` (uuid, primary key)
      - `title` (text)
      - `company` (text)
      - `location` (text)
      - `type` (text)
      - `salary` (text)
      - `description` (text)
      - `requirements` (text array)
      - `tags` (text array)
      - `posted_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `status` (text, default 'active')
    - `applications`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `user_id` (uuid, references auth.users)
      - `status` (text, default 'applied')
      - `applied_at` (timestamp)
      - `cover_letter` (text, optional)
      - `resume_data` (jsonb, optional)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
    - Jobs can be read by everyone, created/updated by authenticated users
    - Applications can only be managed by the applicant and job poster
*/

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  location text NOT NULL,
  type text NOT NULL DEFAULT 'Full-time',
  salary text DEFAULT '',
  description text NOT NULL,
  requirements text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  posted_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'draft', 'closed'))
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'applied' CHECK (status IN ('applied', 'under_review', 'interview_scheduled', 'rejected', 'accepted')),
  applied_at timestamptz DEFAULT now(),
  cover_letter text DEFAULT '',
  resume_data jsonb DEFAULT '{}',
  UNIQUE(job_id, user_id)
);

-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Jobs policies
CREATE POLICY "Anyone can read active jobs"
  ON jobs
  FOR SELECT
  USING (status = 'active');

CREATE POLICY "Authenticated users can create jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Users can update their own jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = posted_by)
  WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Users can delete their own jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = posted_by);

-- Applications policies
CREATE POLICY "Users can read their own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Job posters can read applications for their jobs"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.posted_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Job posters can update application status"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.posted_by = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs(posted_by);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Create updated_at trigger for jobs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_updated_at 
  BEFORE UPDATE ON jobs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();