import React from 'react';
import { User } from '@supabase/supabase-js';

interface EmployerDashboardProps {
  onBack: () => void;
  onAddJob: () => void;
  user: User;
}

export default function EmployerDashboard({ onBack, onAddJob, user }: EmployerDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Employer Dashboard</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user.email}</h2>
          <p className="text-gray-600 mb-4">Manage your job postings and find the best candidates.</p>
          
          <button
            onClick={onAddJob}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add New Job
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Your Job Postings</h3>
          <p className="text-gray-500">No job postings yet. Click "Add New Job" to get started.</p>
        </div>
      </div>
    </div>
  );
}