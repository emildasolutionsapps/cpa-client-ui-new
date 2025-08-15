import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { DataService, Job } from '../services/dataService';

interface FilterContextType {
  // Filter states
  selectedYear: string;
  selectedJobId: string;
  selectedJobName: string;
  selectedStatus: string;

  // Available options
  availableJobs: Job[];
  availableYears: string[];
  availableStatuses: string[];

  // Loading states
  loadingJobs: boolean;

  // Filter actions
  setSelectedYear: (year: string) => void;
  setSelectedJobId: (jobId: string) => void;
  setSelectedJobName: (jobName: string) => void;
  setSelectedStatus: (status: string) => void;

  // Utility functions
  getFilteredJobs: () => Job[];
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};

interface FilterProviderProps {
  children: React.ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const { selectedClientId } = useAuth();
  
  // Filter states
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedJobName, setSelectedJobName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Available options
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>(['2025', '2024', '2023', '2022', '2021']);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  
  // Loading states
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Load jobs when client changes
  useEffect(() => {
    const loadJobs = async () => {
      if (!selectedClientId) {
        setAvailableJobs([]);
        setAvailableYears([]);
        return;
      }

      setLoadingJobs(true);
      try {
        const { data: jobs, error } = await DataService.getJobsForClient(selectedClientId);
        if (error) {
          console.error('Error loading jobs:', error);
          setAvailableJobs([]);
          setAvailableYears([]);
          setAvailableStatuses([]);
        } else {
          setAvailableJobs(jobs || []);

          // Extract years from jobs that actually exist for this client
          const years = new Set<string>();
          const statuses = new Set<string>();
          jobs?.forEach(job => {
            // Try to extract year from job name first (more reliable)
            const yearMatch = job.JobName.match(/20\d{2}/);
            if (yearMatch) {
              years.add(yearMatch[0]);
            } else {
              // Fallback to creation date year if no year in job name
              const createdYear = new Date(job.CreatedAt).getFullYear().toString();
              years.add(createdYear);
            }

            // Collect unique client-facing statuses
            if (job.ClientFacingStatus) {
              statuses.add(job.ClientFacingStatus);
            }
          });

          // Only show years that have jobs - sort newest first
          const sortedYears = Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
          setAvailableYears(sortedYears);

          // Set available statuses
          const sortedStatuses = Array.from(statuses).sort();
          setAvailableStatuses(sortedStatuses);

          // Auto-select the most recent year if current selection is not available
          if (sortedYears.length > 0 && !sortedYears.includes(selectedYear)) {
            setSelectedYear(sortedYears[0]); // Select the most recent year
          }
        }
      } catch (error) {
        console.error('Error loading jobs:', error);
        setAvailableJobs([]);
        setAvailableYears([]);
        setAvailableStatuses([]);
      } finally {
        setLoadingJobs(false);
      }
    };

    loadJobs();
  }, [selectedClientId]);

  // Reset job selection when client changes
  useEffect(() => {
    setSelectedJobId('');
    setSelectedJobName('');
    setSelectedStatus('');
  }, [selectedClientId]);

  // Auto-select first job when jobs are loaded
  useEffect(() => {
    if (availableJobs.length > 0 && !selectedJobId) {
      // Inline filtering logic to avoid dependency issues
      let filteredJobs = availableJobs;
      if (selectedYear) {
        filteredJobs = availableJobs.filter(job => {
          // First try to match year from job name (more reliable)
          const yearMatch = job.JobName.match(/20\d{2}/);
          if (yearMatch && yearMatch[0] === selectedYear) {
            return true;
          }
          // If no year in job name, fallback to creation date
          if (!yearMatch) {
            const createdYear = new Date(job.CreatedAt).getFullYear().toString();
            return createdYear === selectedYear;
          }
          return false;
        });
      }

      if (filteredJobs.length > 0) {
        const firstJob = filteredJobs[0];
        setSelectedJobId(firstJob.JobID);
        setSelectedJobName(firstJob.JobName);
      }
    }
  }, [availableJobs, selectedYear, selectedJobId]);

  // Get filtered jobs based on selected year and status
  const getFilteredJobs = (): Job[] => {
    let filteredJobs = availableJobs;

    // Filter by year
    if (selectedYear) {
      filteredJobs = filteredJobs.filter(job => {
        // First try to match year from job name (more reliable)
        const yearMatch = job.JobName.match(/20\d{2}/);
        if (yearMatch && yearMatch[0] === selectedYear) {
          return true;
        }

        // If no year in job name, fallback to creation date
        if (!yearMatch) {
          const createdYear = new Date(job.CreatedAt).getFullYear().toString();
          return createdYear === selectedYear;
        }

        return false;
      });
    }

    // Filter by status
    if (selectedStatus) {
      filteredJobs = filteredJobs.filter(job => job.ClientFacingStatus === selectedStatus);
    }

    return filteredJobs;
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedYear('2025');
    setSelectedJobId('');
    setSelectedJobName('');
    setSelectedStatus('');
  };

  // Update job name when job ID changes
  useEffect(() => {
    if (selectedJobId) {
      const job = availableJobs.find(j => j.JobID === selectedJobId);
      if (job) {
        setSelectedJobName(job.JobName);
      }
    } else {
      setSelectedJobName('');
    }
  }, [selectedJobId, availableJobs]);

  const value: FilterContextType = {
    // Filter states
    selectedYear,
    selectedJobId,
    selectedJobName,
    selectedStatus,

    // Available options
    availableJobs,
    availableYears,
    availableStatuses,

    // Loading states
    loadingJobs,

    // Filter actions
    setSelectedYear,
    setSelectedJobId,
    setSelectedJobName,
    setSelectedStatus,

    // Utility functions
    getFilteredJobs,
    resetFilters,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};
