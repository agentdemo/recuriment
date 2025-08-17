import React, { useState, useEffect } from 'react';
import { 
  User, 
  Plus, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  ChevronLeft,
  Edit,
  Trash2,
  Eye,
  Users,
  Calendar,
  Building
} from 'lucide-react';
import { jobService, applicationService, type Job, type Application } from '../lib/supabase';

interface EmployerDashboardProps {
  onBack: () => void;
  onAddJob: (job: any) => void;
  user: any;
}

interface JobFormData {
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string;
  tags: string;
}

const EmployerDashboard: React.FC<EmployerDashboardProps> = ({ onBack, onAddJob, user }) => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'create' | 'applications'>('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    company: '',
    location: '',
    type: 'Full-time',
    salary: '',
    description: '',
    requirements: '',
    tags: ''
  });

  useEffect(() => {
    if (user) {
      loadJobs();
      loadApplications();
    }
  }, [user]);

  const loadJobs = async () => {
    try {
      const userJobs = await jobService.getByUserId(user.id);
      setJobs(userJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadApplications = async () => {
    try {
      // Get all applications for user's jobs
      const userJobs = await jobService.getByUserId(user.id);
      const allApplications: Application[] = [];
      
      for (const job of userJobs) {
        const jobApplications = await applicationService.getByJobId(job.id);
        const applicationsWithJob = jobApplications.map(app => ({
          ...app,
          job: job
        }));
        allApplications.push(...applicationsWithJob);
      }
      
      setApplications(allApplications);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const handleInputChange = (field: keyof JobFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const jobData = {
        title: formData.title,
        company: formData.company,
        location: formData.location,
        type: formData.type,
        salary: formData.salary,
        description: formData.description,
        requirements: formData.requirements.split('\n').filter(req => req.trim()),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        status: 'active' as const
      };

      await jobService.create(jobData);
      
      // Reset form
      setFormData({
        title: '',
        company: '',
        location: '',
        type: 'Full-time',
        salary: '',
        description: '',
        requirements: '',
        tags: ''
      });

      // Reload jobs and switch to jobs tab
      await loadJobs();
      setActiveTab('jobs');
      onAddJob(jobData);
      
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Failed to create job. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;

    try {
      await jobService.delete(jobId);
      await loadJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Failed to delete job. Please try again.');
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, status: Application['status']) => {
    try {
      await applicationService.updateStatus(applicationId, status);
      await loadApplications();
    } catch (error) {
      console.error('Error updating application status:', error);
      alert('Failed to update application status. Please try again.');
    }
  };

  const renderSidebar = () => (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="p-6 border-b">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>
        <h2 className="text-xl font-bold text-gray-800">Employer Portal</h2>
      </div>
      
      <nav className="p-4">
        <div className="space-y-2">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'jobs' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <span>My Jobs</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'create' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span>Post New Job</span>
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'applications' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Applications</span>
          </button>
        </div>
      </nav>
    </div>
  );

  const renderJobsList = () => (
    <div className="flex-1 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Job Postings</h1>
        <button
          onClick={() => setActiveTab('create')}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Post New Job</span>
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Job Postings Yet</h3>
          <p className="text-gray-500 mb-6">Create your first job posting to start attracting candidates</p>
          <button
            onClick={() => setActiveTab('create')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Post Your First Job
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{job.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Building className="w-4 h-4" />
                      <span>{job.company}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{job.type}</span>
                    </div>
                    {job.salary && (
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4" />
                        <span>{job.salary}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    job.status === 'active' ? 'bg-green-100 text-green-800' :
                    job.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {job.status}
                  </span>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 mb-4 line-clamp-2">{job.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {job.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{applications.filter(app => app.job_id === job.id).length} applications</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateJob = () => (
    <div className="flex-1 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Post a New Job</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Senior Frontend Developer"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company *</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., TechCorp Inc."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., San Francisco, CA"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Type *</label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Freelance">Freelance</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Salary Range</label>
          <input
            type="text"
            value={formData.salary}
            onChange={(e) => handleInputChange('salary', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., $80,000 - $120,000"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Job Description *</label>
          <textarea
            rows={6}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
          <textarea
            rows={4}
            value={formData.requirements}
            onChange={(e) => handleInputChange('requirements', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="List each requirement on a new line..."
          />
          <p className="text-sm text-gray-500 mt-1">Enter each requirement on a separate line</p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., React, TypeScript, Remote, Senior"
          />
          <p className="text-sm text-gray-500 mt-1">Separate tags with commas</p>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transition-all flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Post Job</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderApplications = () => (
    <div className="flex-1 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Job Applications</h1>
      
      {applications.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Applications Yet</h3>
          <p className="text-gray-500">Applications will appear here once candidates start applying to your jobs</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <div key={application.id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{application.job?.title}</h3>
                  <p className="text-gray-600">{application.job?.company}</p>
                  <p className="text-sm text-gray-500">Applied {new Date(application.applied_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <select
                    value={application.status}
                    onChange={(e) => handleUpdateApplicationStatus(application.id, e.target.value as Application['status'])}
                    className={`px-3 py-1 rounded-full text-sm font-medium border-0 ${
                      application.status === 'applied' ? 'bg-blue-100 text-blue-800' :
                      application.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                      application.status === 'interview_scheduled' ? 'bg-purple-100 text-purple-800' :
                      application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    <option value="applied">Applied</option>
                    <option value="under_review">Under Review</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              
              {application.cover_letter && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Cover Letter</h4>
                  <p className="text-gray-600 text-sm">{application.cover_letter}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {renderSidebar()}
      {activeTab === 'jobs' && renderJobsList()}
      {activeTab === 'create' && renderCreateJob()}
      {activeTab === 'applications' && renderApplications()}
    </div>
  );
};

export default EmployerDashboard;