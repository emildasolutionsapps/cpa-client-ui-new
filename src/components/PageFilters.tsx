import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon, 
  BriefcaseIcon, 
  ChevronDownIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useFilters } from '../contexts/FilterContext';

interface PageFiltersProps {
  showJobFilter?: boolean;
  showYearFilter?: boolean;
  className?: string;
}

export const PageFilters: React.FC<PageFiltersProps> = ({
  showJobFilter = true,
  showYearFilter = false,
  className = ''
}) => {
  const {
    selectedYear,
    selectedJobId,
    selectedJobName,
    availableYears,
    getFilteredJobs,
    loadingJobs,
    setSelectedYear,
    setSelectedJobId,
    resetFilters
  } = useFilters();

  const [isExpanded, setIsExpanded] = useState(false);
  const filteredJobs = getFilteredJobs();

  const hasActiveFilters = (showYearFilter && selectedYear !== '2025') || selectedJobId !== '';

  // If only showing job filter, use a more compact design
  if (showJobFilter && !showYearFilter) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`}>
        <div className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BriefcaseIcon className="w-5 h-5 text-slate-500" />
              <label className="text-sm font-medium text-slate-700">
                Filter by Service:
              </label>
            </div>
            <div className="flex-1 max-w-xs">
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                disabled={loadingJobs || filteredJobs.length === 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50"
              >
                <option value="">All Services</option>
                {filteredJobs.map((job) => (
                  <option key={job.JobID} value={job.JobID}>
                    {job.JobName}
                  </option>
                ))}
              </select>
            </div>
            {selectedJobId && (
              <button
                onClick={() => setSelectedJobId('')}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center space-x-1 px-2 py-1 hover:bg-slate-100 rounded-md transition-colors"
              >
                <XMarkIcon className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full expandable design for multiple filters
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <FunnelIcon className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Filters</h3>
            <p className="text-xs text-slate-500">
              {hasActiveFilters ? 'Filters applied' : 'Filter by year and service'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center space-x-1"
            >
              <XMarkIcon className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ChevronDownIcon 
              className={`w-4 h-4 text-slate-500 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`} 
            />
          </button>
        </div>
      </div>

      {/* Filter Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="p-4 space-y-4">
              {/* Year Filter - Only show if enabled */}
              {showYearFilter && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tax Year
                  </label>
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <CalendarIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Job Filter */}
              {showJobFilter && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Service/Job
                  </label>
                  <div className="relative">
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      disabled={loadingJobs || filteredJobs.length === 0}
                      className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50"
                    >
                      <option value="">All Services</option>
                      {filteredJobs.map((job) => (
                        <option key={job.JobID} value={job.JobID}>
                          {job.JobName}
                        </option>
                      ))}
                    </select>
                    <BriefcaseIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {filteredJobs.length === 0 && !loadingJobs && (
                    <p className="text-xs text-amber-600 mt-1">
                      No services available
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Summary */}
      {hasActiveFilters && !isExpanded && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {showYearFilter && selectedYear !== '2025' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {selectedYear}
              </span>
            )}
            {selectedJobName && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                {selectedJobName.length > 20 ? `${selectedJobName.substring(0, 20)}...` : selectedJobName}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
