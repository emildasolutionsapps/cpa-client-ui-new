import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DataService, Job, Document, Message } from '../services/dataService'

// Custom hook for managing client-specific data
export function useClientData() {
  const { selectedClientId, selectedClient } = useAuth()
  
  // State for different data types
  const [jobs, setJobs] = useState<Job[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [billing, setBilling] = useState<any[]>([])
  
  // Loading states
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingBilling, setLoadingBilling] = useState(false)
  
  // Error states
  const [jobsError, setJobsError] = useState<any>(null)
  const [documentsError, setDocumentsError] = useState<any>(null)
  const [messagesError, setMessagesError] = useState<any>(null)
  const [billingError, setBillingError] = useState<any>(null)

  // Function to fetch jobs for the selected client
  const fetchJobs = async (clientId: string) => {
    setLoadingJobs(true)
    setJobsError(null)
    
    try {
      const { data, error } = await DataService.getJobsForClient(clientId)
      
      if (error) {
        setJobsError(error)
        setJobs([])
      } else {
        setJobs(data || [])
      }
    } catch (error) {
      setJobsError(error)
      setJobs([])
    } finally {
      setLoadingJobs(false)
    }
  }

  // Function to fetch documents for the selected client
  const fetchDocuments = async (clientId: string) => {
    setLoadingDocuments(true)
    setDocumentsError(null)
    
    try {
      const { data, error } = await DataService.getDocumentsForClient(clientId)
      
      if (error) {
        setDocumentsError(error)
        setDocuments([])
      } else {
        setDocuments(data || [])
      }
    } catch (error) {
      setDocumentsError(error)
      setDocuments([])
    } finally {
      setLoadingDocuments(false)
    }
  }

  // Function to fetch messages for the selected client
  const fetchMessages = async (clientId: string) => {
    setLoadingMessages(true)
    setMessagesError(null)
    
    try {
      const { data, error } = await DataService.getMessagesForClient(clientId)
      
      if (error) {
        setMessagesError(error)
        setMessages([])
      } else {
        setMessages(data || [])
      }
    } catch (error) {
      setMessagesError(error)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  // Function to fetch billing for the selected client
  const fetchBilling = async (clientId: string) => {
    setLoadingBilling(true)
    setBillingError(null)
    
    try {
      const { data, error } = await DataService.getBillingForClient(clientId)
      
      if (error) {
        setBillingError(error)
        setBilling([])
      } else {
        setBilling(data || [])
      }
    } catch (error) {
      setBillingError(error)
      setBilling([])
    } finally {
      setLoadingBilling(false)
    }
  }

  // Function to refresh all data for the current client
  const refreshAllData = () => {
    if (selectedClientId) {
      fetchJobs(selectedClientId)
      fetchDocuments(selectedClientId)
      fetchMessages(selectedClientId)
      fetchBilling(selectedClientId)
    }
  }

  // Effect to fetch data when selected client changes
  useEffect(() => {
    if (selectedClientId) {
      refreshAllData()
    } else {
      // Clear data when no client is selected
      setJobs([])
      setDocuments([])
      setMessages([])
      setBilling([])
      setJobsError(null)
      setDocumentsError(null)
      setMessagesError(null)
      setBillingError(null)
    }
  }, [selectedClientId])

  return {
    // Data
    jobs,
    documents,
    messages,
    billing,
    
    // Loading states
    loadingJobs,
    loadingDocuments,
    loadingMessages,
    loadingBilling,
    
    // Error states
    jobsError,
    documentsError,
    messagesError,
    billingError,
    
    // Selected client info
    selectedClient,
    selectedClientId,
    
    // Utility functions
    refreshAllData,
    fetchJobs: () => selectedClientId && fetchJobs(selectedClientId),
    fetchDocuments: () => selectedClientId && fetchDocuments(selectedClientId),
    fetchMessages: () => selectedClientId && fetchMessages(selectedClientId),
    fetchBilling: () => selectedClientId && fetchBilling(selectedClientId),
  }
}
