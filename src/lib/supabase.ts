import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string[];
  tags: string[];
  posted_by: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'draft' | 'closed';
}

export interface Application {
  id: string;
  job_id: string;
  user_id: string;
  status: 'applied' | 'under_review' | 'interview_scheduled' | 'rejected' | 'accepted';
  applied_at: string;
  cover_letter?: string;
  resume_data?: any;
  job?: Job; // For joined queries
}

// Job-related functions
export const jobService = {
  async getAll() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('posted_by', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(job: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'posted_by'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('jobs')
      .insert([{ ...job, posted_by: user.id }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Job>) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Application-related functions
export const applicationService = {
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job:jobs(*)
      `)
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByJobId(jobId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(application: Omit<Application, 'id' | 'applied_at'>) {
    const { data, error } = await supabase
      .from('applications')
      .insert([application])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: Application['status']) {
    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async checkExisting(jobId: string, userId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
};

// Auth helper functions
export const authService = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }
};