import React, { useState } from 'react';
import { useEffect } from 'react';
import LandingPage from './components/LandingPage';
import JobSeekerDashboard from './components/JobSeekerDashboard';
import EmployerDashboard from './components/EmployerDashboard';
import AuthModal from './components/AuthModal';
import { jobService, authService, type Job as SupabaseJob } from './lib/supabase';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  posted: string;
  description: string;
  requirements: string[];
  tags: string[];
}

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'job-seeker' | 'employer'>('landing');
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([
  ]);

  useEffect(() => {
    // Check for existing session
    authService.getCurrentUser().then(user => {
      setUser(user);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setUser(user);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Load jobs when component mounts
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const supabaseJobs = await jobService.getAll();
      const formattedJobs: Job[] = supabaseJobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        salary: job.salary,
        posted: formatTimeAgo(job.created_at),
        description: job.description,
        requirements: job.requirements,
        tags: job.tags
      }));
      setJobs(formattedJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks === 1) return '1 week ago';
    return `${diffInWeeks} weeks ago`;
  };

  const addJob = (newJob: Omit<Job, 'id' | 'posted'>) => {
    // This will be handled by the EmployerDashboard component
    // and will reload jobs from Supabase
    loadJobs();
  };

  const handleGetJob = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView('job-seeker');
  };

  const handlePostJob = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView('employer');
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // The auth state change will be handled by the useEffect
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {currentView === 'landing' && (
        <LandingPage 
          onGetJob={handleGetJob}
          onPostJob={handlePostJob}
        />
      )}
      {currentView === 'job-seeker' && (
        <JobSeekerDashboard 
          onBack={() => setCurrentView('landing')} 
          jobs={jobs}
          user={user}
          onJobsUpdate={loadJobs}
        />
      )}
      {currentView === 'employer' && (
        <EmployerDashboard 
          onBack={() => setCurrentView('landing')} 
          onAddJob={addJob}
          user={user}
        />
      )}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;