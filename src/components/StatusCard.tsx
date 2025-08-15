import React from 'react';
import { motion } from 'framer-motion';

interface StatusCardProps {
  icon: React.ComponentType<any>;
  title: string;
  status: string;
  statusColor: 'emerald' | 'blue' | 'amber' | 'red';
  description: string;
  additionalInfo?: string;
  count?: string;
  action?: string;
  progress?: number;
  onClick?: () => void;
}

const statusColors = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  red: 'bg-red-100 text-red-800 border-red-200',
};

const iconColors = {
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
};

export default function StatusCard({
  icon: Icon,
  title,
  status,
  statusColor,
  description,
  additionalInfo,
  count,
  action,
  progress,
  onClick
}: StatusCardProps) {
  return (
    <motion.div
      className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200"
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${
          statusColor === 'emerald' ? 'from-emerald-50 to-emerald-100' :
          statusColor === 'blue' ? 'from-blue-50 to-blue-100' :
          statusColor === 'amber' ? 'from-amber-50 to-amber-100' :
          'from-red-50 to-red-100'
        }`}>
          <Icon className={`w-6 h-6 ${iconColors[statusColor]}`} />
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[statusColor]}`}>
          {status}
        </span>
      </div>
      
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm mb-1">{description}</p>
      {additionalInfo && <p className="text-slate-500 text-xs">{additionalInfo}</p>}
      {count && <p className="text-slate-800 font-medium text-sm mt-2">{count}</p>}
      
      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Progress</span>
            <span className="text-slate-800 font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <motion.div 
              className={`h-2 rounded-full ${
                statusColor === 'emerald' ? 'bg-emerald-500' :
                statusColor === 'blue' ? 'bg-blue-500' :
                statusColor === 'amber' ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </div>
      )}
      
      {action && (
        <button
          className={`mt-4 text-sm font-medium hover:underline transition-colors ${iconColors[statusColor]}`}
          onClick={onClick}
        >
          {action}
        </button>
      )}
    </motion.div>
  );
}