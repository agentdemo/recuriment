/*
  # Add Attachments and Call Features

  1. New Tables
    - `attachments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `job_id` (uuid, optional foreign key to jobs)
      - `file_name` (text)
      - `file_url` (text)
      - `file_type` (text)
      - `file_size` (integer)
      - `created_at` (timestamp)
    
    - `call_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `job_id` (uuid, optional foreign key to jobs)
      - `recruiter_id` (uuid, foreign key to auth.users)
      - `status` (text: pending, completed, cancelled)
      - `phone_number` (text)
      - `preferred_time` (text)
      - `notes` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Users can only view/manage their own attachments
    - Users can only create call requests for themselves
    - Recruiters can view call requests for their jobs
*/

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create call_requests table
CREATE TABLE IF NOT EXISTS call_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  recruiter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  phone_number text NOT NULL,
  preferred_time text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_requests ENABLE ROW LEVEL SECURITY;

-- Attachments policies
CREATE POLICY "Users can view own attachments"
  ON attachments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments"
  ON attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attachments"
  ON attachments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
  ON attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Call requests policies
CREATE POLICY "Users can view own call requests"
  ON call_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = recruiter_id);

CREATE POLICY "Users can create own call requests"
  ON call_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own call requests"
  ON call_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Recruiters can update call requests"
  ON call_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = recruiter_id)
  WITH CHECK (auth.uid() = recruiter_id);