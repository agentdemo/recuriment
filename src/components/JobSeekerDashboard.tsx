import React, { useState } from 'react';
import { useEffect } from 'react';
import AIResumeBuilder from './AIResumeBuilder';
import ResumeRating from './ResumeRating';
import AIChatbot from './AIChatbot';
import { applicationService, attachmentService, callRequestService, type Application, type Attachment, type CallRequest } from '../lib/supabase';
import {
  User,
  FileText,
  Briefcase,
  Settings,
  Home,
  Search,
  Filter,
  MapPin,
  Clock,
  DollarSign,
  ChevronLeft,
  Star,
  Send,
  Sparkles,
  TrendingUp,
  MessageCircle,
  Upload,
  Phone,
  Paperclip,
  X,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface JobSeekerDashboardProps {
  onBack: () => void;
  jobs: Job[];
  user: any;
  onJobsUpdate: () => void;
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

interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
  };
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  skills: string[];
}

const JobSeekerDashboard: React.FC<JobSeekerDashboardProps> = ({ onBack, jobs, user, onJobsUpdate }) => {
  const [activeTab, setActiveTab] = useState('jobs');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [showResumeRating, setShowResumeRating] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [savedResume, setSavedResume] = useState<ResumeData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [callRequests, setCallRequests] = useState<CallRequest[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submittingCall, setSubmittingCall] = useState(false);

  const handleSaveResume = (resumeData: ResumeData) => {
    setSavedResume(resumeData);
    setShowAIBuilder(false);
  };

  useEffect(() => {
    if (user) {
      loadApplications();
      loadAttachments();
      loadCallRequests();
    }
  }, [user]);

  const loadApplications = async () => {
    if (!user) return;

    try {
      const userApplications = await applicationService.getByUserId(user.id);
      setApplications(userApplications);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const loadAttachments = async () => {
    if (!user) return;

    try {
      const userAttachments = await attachmentService.getByUserId(user.id);
      setAttachments(userAttachments);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const loadCallRequests = async () => {
    if (!user) return;

    try {
      const userCallRequests = await callRequestService.getByUserId(user.id);
      setCallRequests(userCallRequests);
    } catch (error) {
      console.error('Error loading call requests:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await attachmentService.create({
          user_id: user.id,
          file_name: file.name,
          file_url: base64,
          file_type: file.type,
          file_size: file.size
        });

        await loadAttachments();
        setShowUploadModal(false);
        alert('File uploaded successfully!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      await attachmentService.delete(id);
      await loadAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Failed to delete attachment. Please try again.');
    }
  };

  const handleCallRequest = async (formData: { phoneNumber: string; preferredTime: string; notes: string }) => {
    if (!user || !selectedJob) return;

    setSubmittingCall(true);
    try {
      await callRequestService.create({
        user_id: user.id,
        job_id: selectedJob.id,
        recruiter_id: (selectedJob as any).posted_by || '',
        status: 'pending',
        phone_number: formData.phoneNumber,
        preferred_time: formData.preferredTime,
        notes: formData.notes
      });

      await loadCallRequests();
      setShowCallModal(false);
      alert('Call request submitted successfully! The recruiter will contact you soon.');
    } catch (error) {
      console.error('Error submitting call request:', error);
      alert('Failed to submit call request. Please try again.');
    } finally {
      setSubmittingCall(false);
    }
  };

  const handleApplyToJob = async (job: Job) => {
    if (!user) {
      alert('Please sign in to apply for jobs');
      return;
    }

    try {
      // Check if already applied
      const existingApplication = await applicationService.checkExisting(job.id, user.id);
      if (existingApplication) {
        alert('You have already applied to this job');
        return;
      }

      // Create application
      await applicationService.create({
        job_id: job.id,
        user_id: user.id,
        status: 'applied',
        cover_letter: '',
        resume_data: savedResume || {}
      });

      alert('Application submitted successfully!');
      loadApplications();
    } catch (error) {
      console.error('Error applying to job:', error);
      alert('Failed to submit application. Please try again.');
    }
  };

  // Mock user profile data
  const userProfile = {
    name: user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    bio: 'Passionate frontend developer with 5+ years of experience building responsive web applications...'
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
        <h2 className="text-xl font-bold text-gray-800">Job Seeker</h2>
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
            <span>Browse Jobs</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'profile' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'resume' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Resume</span>
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'applications' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Send className="w-5 h-5" />
            <span>Applications</span>
          </button>
          <button
            onClick={() => setActiveTab('chatbot')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'chatbot' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span>AI Assistant</span>
          </button>
        </div>
      </nav>
    </div>
  );

  const renderJobSearch = () => (
    <div className="flex-1 p-6">
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Find Your Next Opportunity</h1>
          <button
            onClick={() => setShowResumeRating(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <TrendingUp className="w-5 h-5" />
            <span>Rate My Resume</span>
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs, companies, skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Job Listings */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={`p-6 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
                selectedJob?.id === job.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-semibold text-gray-800">{job.title}</h3>
                <div className="flex items-center space-x-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm text-gray-600">4.8</span>
                </div>
              </div>
              
              <p className="text-blue-600 font-medium mb-2">{job.company}</p>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{job.type}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <DollarSign className="w-4 h-4" />
                  <span>{job.salary}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {job.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              
              <p className="text-sm text-gray-500">{job.posted}</p>
            </div>
          ))}
        </div>

        {/* Job Details */}
        <div className="lg:sticky lg:top-6">
          {selectedJob ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedJob.title}</h2>
                <p className="text-blue-600 font-medium text-lg mb-4">{selectedJob.company}</p>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedJob.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{selectedJob.type}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-4 h-4" />
                    <span>{selectedJob.salary}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Job Description</h3>
                <p className="text-gray-600 leading-relaxed">{selectedJob.description}</p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Requirements</h3>
                <ul className="space-y-2">
                  {selectedJob.requirements.map((req, index) => (
                    <li key={index} className="flex items-center space-x-2 text-gray-600">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:-translate-y-0.5">
                <span onClick={() => handleApplyToJob(selectedJob)}>Apply Now</span>
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a job to view details</h3>
              <p className="text-gray-500">Click on any job listing to see more information and apply</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="flex-1 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Profile Settings</h1>

      {/* Quick Action Buttons */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center justify-center space-x-3 p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Upload className="w-6 h-6" />
          <span>Upload Attachment</span>
        </button>
        <button
          onClick={() => {
            if (!selectedJob) {
              alert('Please select a job first to request a call with the recruiter');
              return;
            }
            setShowCallModal(true);
          }}
          className="flex items-center justify-center space-x-3 p-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Phone className="w-6 h-6" />
          <span>Call Recruiter</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-6 mb-8">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">John Doe</h2>
            <p className="text-gray-600">Frontend Developer</p>
            <p className="text-sm text-gray-500">San Francisco, CA</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input 
              type="text" 
              defaultValue={userProfile.name} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input 
              type="email" 
              defaultValue={userProfile.email} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input 
              type="tel" 
              defaultValue="+1 (555) 123-4567" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input 
              type="text" 
              defaultValue="San Francisco, CA" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
          <textarea 
            rows={4}
            defaultValue="Passionate frontend developer with 5+ years of experience building responsive web applications..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="mt-8">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Paperclip className="w-5 h-5 mr-2" />
          My Attachments
        </h2>
        {attachments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No attachments uploaded yet</p>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-800">{attachment.file_name}</p>
                    <p className="text-sm text-gray-500">
                      {(attachment.file_size / 1024).toFixed(2)} KB - {new Date(attachment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call Requests Section */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Phone className="w-5 h-5 mr-2" />
          Call Requests
        </h2>
        {callRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No call requests yet</p>
        ) : (
          <div className="space-y-3">
            {callRequests.map((request) => (
              <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-800">{request.job?.title}</p>
                    <p className="text-sm text-gray-600">{request.job?.company}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Phone: {request.phone_number}</p>
                {request.preferred_time && (
                  <p className="text-sm text-gray-500">Preferred Time: {request.preferred_time}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">Requested {new Date(request.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderResume = () => (
    <div className="flex-1 p-6">
      {showAIBuilder ? (
        <AIResumeBuilder 
          onSave={handleSaveResume}
          onBack={() => setShowAIBuilder(false)}
        />
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Resume Builder</h1>
            <button
              onClick={() => setShowAIBuilder(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-5 h-5" />
              <span>AI Resume Builder</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {savedResume ? (
              <>
                {/* AI Generated Resume Display */}
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2 text-purple-700">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-medium">AI-Generated Resume</span>
                  </div>
                </div>

                {/* Header */}
                <div className="text-center mb-8 pb-6 border-b border-gray-200">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{savedResume.personalInfo.name}</h1>
                  <div className="flex flex-wrap justify-center gap-4 text-gray-600">
                    <span>{savedResume.personalInfo.email}</span>
                    <span>•</span>
                    <span>{savedResume.personalInfo.phone}</span>
                    <span>•</span>
                    <span>{savedResume.personalInfo.location}</span>
                  </div>
                </div>

                {/* Summary */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-3">Professional Summary</h2>
                  <p className="text-gray-600 leading-relaxed">{savedResume.personalInfo.summary}</p>
                </div>

                {/* Experience */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Experience</h2>
                  <div className="space-y-6">
                    {savedResume.experience.map((exp, index) => (
                      <div key={index} className="border-l-4 border-blue-600 pl-6">
                        <h3 className="text-lg font-semibold text-gray-800">{exp.title}</h3>
                        <p className="text-blue-600 font-medium">{exp.company}</p>
                        <p className="text-sm text-gray-500 mb-2">{exp.duration}</p>
                        <p className="text-gray-600">{exp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Education</h2>
                  <div className="space-y-4">
                    {savedResume.education.map((edu, index) => (
                      <div key={index} className="border-l-4 border-green-600 pl-6">
                        <h3 className="text-lg font-semibold text-gray-800">{edu.degree}</h3>
                        <p className="text-green-600 font-medium">{edu.school}</p>
                        <p className="text-sm text-gray-500">{edu.year}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {savedResume.skills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Default Resume Template */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Experience</h2>
                  <div className="space-y-6">
                    <div className="border-l-4 border-blue-600 pl-6">
                      <h3 className="text-lg font-semibold text-gray-800">Senior Frontend Developer</h3>
                      <p className="text-blue-600 font-medium">TechCorp Inc.</p>
                      <p className="text-sm text-gray-500 mb-2">2021 - Present</p>
                      <p className="text-gray-600">Led development of responsive web applications using React and TypeScript...</p>
                    </div>
                    <div className="border-l-4 border-gray-300 pl-6">
                      <h3 className="text-lg font-semibold text-gray-800">Frontend Developer</h3>
                      <p className="text-blue-600 font-medium">StartupXYZ</p>
                      <p className="text-sm text-gray-500 mb-2">2019 - 2021</p>
                      <p className="text-gray-600">Developed and maintained user interfaces for web applications...</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {['React', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Node.js', 'Git', 'Figma'].map((skill) => (
                      <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Education</h2>
                  <div className="border-l-4 border-green-600 pl-6">
                    <h3 className="text-lg font-semibold text-gray-800">Bachelor of Computer Science</h3>
                    <p className="text-green-600 font-medium">University of California</p>
                    <p className="text-sm text-gray-500">2015 - 2019</p>
                  </div>
                </div>
              </>
            )}
            
            <div className="mt-8 flex space-x-4">
              <button 
                onClick={() => {
                  // Create a simple PDF download for the default resume
                  const element = document.createElement('a');
                  const file = new Blob(['Resume content would be here'], {type: 'text/plain'});
                  element.href = URL.createObjectURL(file);
                  element.download = 'resume.pdf';
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download PDF
              </button>
              <button 
                onClick={() => setShowAIBuilder(true)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {savedResume ? 'Regenerate with AI' : 'Edit Resume'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderApplications = () => (
    <div className="flex-1 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">My Applications</h1>
      <div className="space-y-4">
        {applications.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Applications Yet</h3>
            <p className="text-gray-500">Start applying to jobs to see your applications here</p>
          </div>
        ) : (
          applications.map((app) => (
          <div key={app.id} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{app.job?.title}</h3>
                <p className="text-blue-600 font-medium">{app.job?.company}</p>
                <p className="text-sm text-gray-500 mt-1">Applied {new Date(app.applied_at).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                app.status === 'interview_scheduled' ? 'bg-blue-100 text-blue-800' :
                app.status === 'under_review' || app.status === 'applied' ? 'bg-yellow-100 text-yellow-800' :
                app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {app.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {showResumeRating ? (
        <div className="flex-1">
          <ResumeRating onBack={() => setShowResumeRating(false)} />
        </div>
      ) : showChatbot ? (
        <div className="flex-1">
          <AIChatbot
            onBack={() => setShowChatbot(false)}
            userProfile={userProfile}
            resumeData={savedResume}
          />
        </div>
      ) : (
        <>
          {renderSidebar()}
          {activeTab === 'jobs' && renderJobSearch()}
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'resume' && renderResume()}
          {activeTab === 'applications' && renderApplications()}
          {activeTab === 'chatbot' && (
            <div className="flex-1">
              <AIChatbot
                onBack={() => setActiveTab('jobs')}
                userProfile={userProfile}
                resumeData={savedResume}
              />
            </div>
          )}
        </>
      )}

      {/* Upload Attachment Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Attachment</h2>
              <p className="text-gray-600">Upload your resume, cover letter, or other documents</p>
            </div>

            <div className="mb-6">
              <label className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <span className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</span>
                <span className="text-xs text-gray-500">PDF, DOC, DOCX (MAX. 10MB)</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                />
              </label>
            </div>

            {uploadingFile && (
              <div className="flex items-center justify-center space-x-3 text-blue-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Uploading...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call Recruiter Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowCallModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Request a Call</h2>
              <p className="text-gray-600">Schedule a call with the recruiter for {selectedJob?.title}</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCallRequest({
                phoneNumber: formData.get('phoneNumber') as string,
                preferredTime: formData.get('preferredTime') as string,
                notes: formData.get('notes') as string
              });
            }}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Time
                  </label>
                  <input
                    type="text"
                    name="preferredTime"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., Weekdays 2-4 PM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Any specific topics you'd like to discuss..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingCall}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center space-x-2"
              >
                {submittingCall ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5" />
                    <span>Request Call</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobSeekerDashboard;