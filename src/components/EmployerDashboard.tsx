import React, { useState } from 'react';
import { useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { jobService, applicationService, type Job as SupabaseJob } from '../lib/supabase';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  DollarSign, 
  FileText, 
  Sparkles, 
  Loader2, 
  Save, 
  Eye,
  Users,
  Briefcase,
  CheckCircle,
  Plus
} from 'lucide-react';

interface EmployerDashboardProps {
  onBack: () => void;
  onAddJob: (job: Omit<Job, 'id' | 'posted'>) => void;
  user: any;
}

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  requirements: string[];
  description: string;
  type: string;
  posted: string;
  status: 'active' | 'draft' | 'closed';
}

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

const EmployerDashboard: React.FC<EmployerDashboardProps> = ({ onBack, onAddJob, user }) => {
  const [activeTab, setActiveTab] = useState('post-job');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    company: '',
    location: '',
    salary: '',
    requirements: '',
    description: '',
    type: 'Full-time'
  });
  const [postedJobs, setPostedJobs] = useState<JobPosting[]>([
  ]);

  const genAI = new GoogleGenerativeAI('AIzaSyB7Hbl5seOhDqFSgPZCvV4ymlFTdKM_5gw');

  useEffect(() => {
    if (user) {
      loadEmployerJobs();
    }
  }, [user]);

  const loadEmployerJobs = async () => {
    if (!user) return;
    
    try {
      const jobs = await jobService.getByUserId(user.id);
      const formattedJobs: JobPosting[] = jobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        requirements: job.requirements,
        description: job.description,
        type: job.type,
        posted: formatTimeAgo(job.created_at),
        status: job.status as 'active' | 'draft' | 'closed'
      }));
      setPostedJobs(formattedJobs);
    } catch (error) {
      console.error('Error loading employer jobs:', error);
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

  const handleInputChange = (field: string, value: string) => {
    setJobForm(prev => ({ ...prev, [field]: value }));
  };

  const generateJobDescription = async () => {
    if (!jobForm.title || !jobForm.company) {
      alert('Please fill in at least the job title and company name to generate a description.');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `
        Generate a comprehensive and professional job description for the following position:

        Job Title: ${jobForm.title}
        Company: ${jobForm.company}
        Location: ${jobForm.location || 'Not specified'}
        Salary Range: ${jobForm.salary || 'Competitive'}
        Requirements: ${jobForm.requirements || 'Standard requirements for this role'}

        Please create a detailed job description that includes:
        1. A compelling overview of the role and company
        2. Key responsibilities and duties
        3. Required qualifications and skills
        4. Preferred qualifications
        5. Benefits and what makes this opportunity attractive
        6. Company culture highlights

        Make it professional, engaging, and tailored to attract top talent. The description should be 3-4 paragraphs long and highlight why candidates would want to work for this company.
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const generatedDescription = response.text();

      setJobForm(prev => ({ ...prev, description: generatedDescription }));
    } catch (error) {
      console.error('Error generating job description:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('503') && errorMessage.includes('overloaded')) {
        alert('The AI service is currently busy. Please try again in a few moments.');
      } else {
        alert('Failed to generate job description. Please try again or write it manually.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePostJob = async () => {
    if (!jobForm.title || !jobForm.company || !jobForm.location || !jobForm.description) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsPosting(true);
    try {
      const jobData = {
        title: jobForm.title,
        company: jobForm.company,
        location: jobForm.location,
        type: jobForm.type,
        salary: jobForm.salary,
        description: jobForm.description,
        requirements: jobForm.requirements.split(',').map(req => req.trim()).filter(req => req),
        tags: [
          jobForm.type,
          jobForm.location.includes('Remote') ? 'Remote' : 'On-site',
          jobForm.salary.includes('$') ? 'Competitive Salary' : 'Salary Negotiable'
        ].filter(tag => tag),
        status: 'active' as const
      };

      await jobService.create(jobData);
      
      // Notify parent to reload jobs
      onAddJob({
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        type: jobData.type,
        salary: jobData.salary,
        description: jobData.description,
        requirements: jobData.requirements,
        tags: jobData.tags
      });

      // Reset form
      setJobForm({
        title: '',
        company: '',
        location: '',
        salary: '',
        requirements: '',
        description: '',
        type: 'Full-time'
      });
      
      alert('Job posted successfully!');
      loadEmployerJobs();
      setActiveTab('manage-jobs');
    } catch (error) {
      console.error('Error posting job:', error);
      alert('Failed to post job. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const renderPostJob = () => (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Post a New Job</h1>
          <p className="text-gray-600">Create an attractive job posting to find the perfect candidate</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                value={jobForm.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Senior Frontend Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={jobForm.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., TechCorp Inc."
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={jobForm.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., San Francisco, CA or Remote"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Type
              </label>
              <select
                value={jobForm.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Freelance">Freelance</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salary Range
            </label>
            <input
              type="text"
              value={jobForm.salary}
              onChange={(e) => handleInputChange('salary', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., $80k - $120k or Competitive"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requirements & Skills
            </label>
            <textarea
              rows={3}
              value={jobForm.requirements}
              onChange={(e) => handleInputChange('requirements', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., React, TypeScript, 5+ years experience, Bachelor's degree (separate with commas)"
            />
          </div>

          {/* Job Description with AI Generation */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Job Description *
              </label>
              <button
                onClick={generateJobDescription}
                disabled={isGenerating || !jobForm.title || !jobForm.company}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all flex items-center space-x-2 text-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>AI Generate</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={8}
              value={jobForm.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Describe the role, responsibilities, company culture, and what makes this opportunity attractive..."
            />
            <p className="text-sm text-gray-500 mt-2">
              Tip: Use the AI Generate button to create a professional job description based on your inputs
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              onClick={onBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </button>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  // Save as draft functionality
                  alert('Job saved as draft!');
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <Save className="w-5 h-5" />
                <span>Save Draft</span>
              </button>
              <button
                onClick={handlePostJob}
                disabled={isPosting}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center space-x-2"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="w-5 h-5" />
                    <span>Post Job</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderManageJobs = () => (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Manage Job Postings</h1>
            <p className="text-gray-600">View and manage your active job listings</p>
          </div>
          <button
            onClick={() => setActiveTab('post-job')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Post New Job</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {postedJobs.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Jobs Posted Yet</h3>
            <p className="text-gray-500">Create your first job posting to start finding candidates</p>
          </div>
        ) : (
        postedJobs.map((job) => (
          <div key={job.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{job.title}</h3>
                <div className="flex items-center space-x-4 text-gray-600 mb-3">
                  <div className="flex items-center space-x-1">
                    <Building2 className="w-4 h-4" />
                    <span>{job.company}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-4 h-4" />
                    <span>{job.salary}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    job.status === 'active' ? 'bg-green-100 text-green-800' :
                    job.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">Posted {job.posted}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <FileText className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 line-clamp-3">{job.description}</p>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {job.requirements.map((req, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {req}
                </span>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>24 Applications</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>156 Views</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Edit
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  View Applications
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">Employer Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('post-job')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'post-job' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Post Job
              </button>
              <button
                onClick={() => setActiveTab('manage-jobs')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'manage-jobs' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Manage Jobs
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'post-job' && renderPostJob()}
        {activeTab === 'manage-jobs' && renderManageJobs()}
      </main>
    </div>
  );
};

export default EmployerDashboard;