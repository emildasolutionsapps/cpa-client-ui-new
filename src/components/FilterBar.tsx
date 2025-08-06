import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, UserIcon, CalendarIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useFilters } from '../contexts/FilterContext';

// Simplified interface - no longer need props since we use context
interface FilterBarProps {}

export default function FilterBar({}: FilterBarProps) {
  const {
    availableClients,
    selectedClient,
    selectedClientId,
    setSelectedClient,
    loadingClients
  } = useAuth();

  const {
    selectedYear,
    selectedJobId,
    selectedJobName,
    availableYears,
    getFilteredJobs,
    loadingJobs,
    setSelectedYear,
    setSelectedJobId
  } = useFilters();

  const handleJobChange = (jobId: string) => {
    setSelectedJobId(jobId);
  };
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header Section */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Tax Dashboard</h2>
        <p className="text-slate-600">Select your preferences to view personalized information</p>
      </div>

      {/* Filter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">

        {/* Client Filter */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Client Profile</h3>
              <p className="text-xs text-slate-500">Select active profile</p>
            </div>
          </div>
          <div className="relative">
            <select
              value={selectedClient?.ClientID || ''}
              onChange={(e) => setSelectedClient(e.target.value)}
              disabled={loadingClients || availableClients.length === 0}
              className="appearance-none w-full bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-slate-800 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50"
            >
              {availableClients.length === 0 ? (
                <option value="">No clients available</option>
              ) : (
                availableClients.map((client) => (
                  <option key={client.ClientID} value={client.ClientID}>
                    {client.ClientName}
                  </option>
                ))
              )}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
        </motion.div>

        {/* Year Filter */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Tax Year</h3>
              <p className="text-xs text-slate-500">Filing period</p>
            </div>
          </div>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={availableYears.length === 0}
              className="appearance-none w-full bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-slate-800 hover:border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 disabled:opacity-50"
            >
              {availableYears.length === 0 ? (
                <option value="">No years available</option>
              ) : (
                availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))
              )}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
        </motion.div>

        {/* Job Filter */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
              <BriefcaseIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Service Type</h3>
              <p className="text-xs text-slate-500">Current filing</p>
            </div>
          </div>
          <div className="relative">
            <select
              value={selectedJobId}
              onChange={(e) => handleJobChange(e.target.value)}
              disabled={loadingJobs || getFilteredJobs().length === 0}
              className="appearance-none w-full bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-slate-800 hover:border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200 disabled:opacity-50"
            >
              {loadingJobs ? (
                <option value="">Loading services...</option>
              ) : getFilteredJobs().length === 0 ? (
                <option value="">No services available for {selectedYear}</option>
              ) : (
                <>
                  <option value="">Select a service type...</option>
                  {getFilteredJobs().map((job) => (
                    <option key={job.JobID} value={job.JobID}>
                      {job.JobName}
                    </option>
                  ))}
                </>
              )}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
        </motion.div>

      </div>

      {/* Status Indicator */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-emerald-50 px-4 py-2 rounded-full border border-blue-100">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-slate-700">
            Viewing: {selectedClient?.ClientName || 'No client selected'} • {selectedYear} • {selectedJobName || 'No service selected'}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}