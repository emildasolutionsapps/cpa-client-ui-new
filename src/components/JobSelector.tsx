import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Job } from '../services/dataService';

interface JobSelectorProps {
  jobs: Job[];
  selectedJob: Job | null;
  onJobSelect: (job: Job) => void;
  loading?: boolean;
}

// Helper function to get status icon
const getStatusIcon = (clientFacingStatus: string) => {
  switch (clientFacingStatus) {
    case 'Action Required':
      return ExclamationTriangleIcon;
    case 'In Progress':
      return ClockIcon;
    case 'In Review':
      return EyeIcon;
    case 'Completed':
      return CheckCircleIcon;
    default:
      return ClockIcon;
  }
};

// Helper function to get status color
const getStatusColor = (clientFacingStatus: string) => {
  switch (clientFacingStatus) {
    case 'Action Required':
      return 'text-red-600';
    case 'In Progress':
      return 'text-blue-600';
    case 'In Review':
      return 'text-amber-600';
    case 'Completed':
      return 'text-emerald-600';
    default:
      return 'text-slate-600';
  }
};

export default function JobSelector({ jobs, selectedJob, onJobSelect, loading }: JobSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-slate-500 text-center">
          No jobs found for this client
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Select Job
      </label>
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-left shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedJob ? (
                <>
                  {(() => {
                    const StatusIcon = getStatusIcon(selectedJob.ClientFacingStatus || 'In Progress');
                    const statusColor = getStatusColor(selectedJob.ClientFacingStatus || 'In Progress');
                    return <StatusIcon className={`w-5 h-5 ${statusColor}`} />;
                  })()}
                  <div>
                    <div className="font-medium text-slate-900">
                      {selectedJob.JobName}
                    </div>
                    <div className="text-sm text-slate-500">
                      {selectedJob.ServiceTemplateName} • {selectedJob.ClientFacingStatus}
                    </div>
                  </div>
                </>
              ) : (
                <span className="text-slate-500">Select a job...</span>
              )}
            </div>
            <ChevronDownIcon 
              className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 overflow-y-auto"
            >
              <div className="py-2">
                {jobs.map((job) => {
                  const StatusIcon = getStatusIcon(job.ClientFacingStatus || 'In Progress');
                  const statusColor = getStatusColor(job.ClientFacingStatus || 'In Progress');
                  const isSelected = selectedJob?.JobID === job.JobID;
                  
                  return (
                    <button
                      key={job.JobID}
                      onClick={() => {
                        onJobSelect(job);
                        setIsOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${
                            isSelected ? 'text-blue-900' : 'text-slate-900'
                          }`}>
                            {job.JobName}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-slate-500">
                            <span>{job.ServiceTemplateName}</span>
                            <span>•</span>
                            <span className={statusColor}>
                              {job.ClientFacingStatus}
                            </span>
                            {job.DueDate && (
                              <>
                                <span>•</span>
                                <span>Due: {new Date(job.DueDate).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
