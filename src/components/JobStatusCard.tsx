import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Job } from '../services/dataService';

interface JobStatusCardProps {
  job: Job;
  onClick?: () => void;
  showProgress?: boolean;
}

// Helper function to get status styling and icon
const getStatusInfo = (clientFacingStatus: string) => {
  switch (clientFacingStatus) {
    case 'Action Required':
      return {
        icon: ExclamationTriangleIcon,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        gradientFrom: 'from-red-50',
        gradientTo: 'to-red-100',
        progressColor: 'bg-red-500',
        statusText: 'Action Required',
        description: 'Please provide additional information or documents',
      };
    case 'In Progress':
      return {
        icon: ClockIcon,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        gradientFrom: 'from-blue-50',
        gradientTo: 'to-blue-100',
        progressColor: 'bg-blue-500',
        statusText: 'In Progress',
        description: 'Our team is working on your request',
      };
    case 'In Review':
      return {
        icon: EyeIcon,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        gradientFrom: 'from-amber-50',
        gradientTo: 'to-amber-100',
        progressColor: 'bg-amber-500',
        statusText: 'In Review',
        description: 'Under review by our team',
      };
    case 'Completed':
      return {
        icon: CheckCircleIcon,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        gradientFrom: 'from-emerald-50',
        gradientTo: 'to-emerald-100',
        progressColor: 'bg-emerald-500',
        statusText: 'Completed',
        description: 'Your request has been completed',
      };
    default:
      return {
        icon: ClockIcon,
        color: 'text-slate-600',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        gradientFrom: 'from-slate-50',
        gradientTo: 'to-slate-100',
        progressColor: 'bg-slate-500',
        statusText: 'Unknown',
        description: 'Status information not available',
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

export default function JobStatusCard({ job, onClick, showProgress = true }: JobStatusCardProps) {
  const statusInfo = getStatusInfo(job.ClientFacingStatus || 'In Progress');
  const progress = getProgressPercentage(job.ClientFacingStatus || 'In Progress', job.IsFinalStatus);
  const Icon = statusInfo.icon;

  return (
    <motion.div
      className={`bg-white rounded-2xl p-6 shadow-sm border ${statusInfo.borderColor} hover:shadow-md transition-all duration-200 cursor-pointer`}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${statusInfo.gradientFrom} ${statusInfo.gradientTo}`}>
          <Icon className={`w-6 h-6 ${statusInfo.color}`} />
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.statusText}
          </div>
          {job.DueDate && (
            <div className="text-xs text-slate-500 mt-1">
              Due: {new Date(job.DueDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="mb-3">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          {job.JobName}
        </h3>
        <p className="text-sm text-slate-600 mb-2">
          {job.ServiceTemplateName || 'Service'}
        </p>
        <p className="text-sm text-slate-500">
          {statusInfo.description}
        </p>
      </div>

      {showProgress && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">Progress</span>
            <span className="text-slate-800 font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <motion.div 
              className={`h-2 rounded-full ${statusInfo.progressColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </div>
      )}

      {job.Priority && (
        <div className="mt-3 flex items-center">
          <span className="text-xs text-slate-500">Priority: </span>
          <span className={`text-xs font-medium ml-1 ${
            job.Priority === 'High' ? 'text-red-600' :
            job.Priority === 'Medium' ? 'text-amber-600' :
            'text-slate-600'
          }`}>
            {job.Priority}
          </span>
        </div>
      )}
    </motion.div>
  );
}
