import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Job } from '../services/dataService';

interface JobStatusBannerProps {
  job: Job;
  showProgress?: boolean;
}

// Helper function to get banner styling based on status
const getBannerInfo = (clientFacingStatus: string) => {
  switch (clientFacingStatus) {
    case 'Action Required':
      return {
        icon: ExclamationTriangleIcon,
        gradient: 'from-red-500 to-red-600',
        title: 'Action Required',
        emoji: '⚠️',
        description: 'We need additional information from you to proceed.',
      };
    case 'In Progress':
      return {
        icon: ClockIcon,
        gradient: 'from-blue-500 to-blue-600',
        title: 'In Progress',
        emoji: '⚡',
        description: 'Our team is actively working on your request.',
      };
    case 'In Review':
      return {
        icon: EyeIcon,
        gradient: 'from-amber-500 to-amber-600',
        title: 'Under Review',
        emoji: '🔍',
        description: 'Your documents are being carefully reviewed by our team.',
      };
    case 'Completed':
      return {
        icon: CheckCircleIcon,
        gradient: 'from-emerald-500 to-emerald-600',
        title: 'Completed',
        emoji: '✅',
        description: 'Your request has been successfully completed!',
      };
    default:
      return {
        icon: ClockIcon,
        gradient: 'from-slate-500 to-slate-600',
        title: 'Processing',
        emoji: '⏳',
        description: 'We are processing your request.',
      };
  }
};

// Helper function to calculate progress based on status
const getProgressPercentage = (clientFacingStatus: string, isFinalStatus?: boolean) => {
  if (isFinalStatus) return 100;
  
  switch (clientFacingStatus) {
    case 'Action Required':
      return 25;
    case 'In Progress':
      return 50;
    case 'In Review':
      return 85;
    case 'Completed':
      return 100;
    default:
      return 0;
  }
};

export default function JobStatusBanner({ job, showProgress = true }: JobStatusBannerProps) {
  const bannerInfo = getBannerInfo(job.ClientFacingStatus || 'In Progress');
  const progress = getProgressPercentage(job.ClientFacingStatus || 'In Progress', job.IsFinalStatus);
  const Icon = bannerInfo.icon;

  return (
    <motion.div 
      className={`bg-gradient-to-r ${bannerInfo.gradient} rounded-2xl p-8 text-white mb-8 shadow-lg`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-3">
            <Icon className="w-8 h-8 mr-3" />
            <h1 className="text-2xl font-bold">
              {job.JobName} is currently {bannerInfo.title} {bannerInfo.emoji}
            </h1>
          </div>
          <p className="text-blue-100 text-lg mb-2">
            {bannerInfo.description}
          </p>
          <div className="flex items-center text-blue-100">
            <span className="text-sm">Service: </span>
            <span className="text-sm font-medium ml-1">
              {job.ServiceTemplateName || 'Tax Service'}
            </span>
            {job.DueDate && (
              <>
                <span className="mx-2">•</span>
                <span className="text-sm">
                  Due: {new Date(job.DueDate).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        </div>
        
        {showProgress && (
          <div className="text-right ml-8">
            <div className="text-4xl font-bold mb-1">{progress}%</div>
            <div className="text-blue-100 text-lg">Complete</div>
            
            {/* Progress bar */}
            <div className="w-32 bg-white bg-opacity-20 rounded-full h-2 mt-3">
              <motion.div 
                className="h-2 rounded-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Additional info section */}
      {(job.Priority || job.StatusName) && (
        <div className="mt-6 pt-6 border-t border-white border-opacity-20">
          <div className="flex items-center space-x-6 text-sm text-blue-100">
            {job.StatusName && (
              <div className="flex items-center">
                <span>Internal Status: </span>
                <span className="font-medium ml-1">{job.StatusName}</span>
              </div>
            )}
            {job.Priority && (
              <div className="flex items-center">
                <span>Priority: </span>
                <span className={`font-medium ml-1 ${
                  job.Priority === 'High' ? 'text-red-200' :
                  job.Priority === 'Medium' ? 'text-yellow-200' :
                  'text-blue-200'
                }`}>
                  {job.Priority}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
