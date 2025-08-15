import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon, 
  DocumentIcon, 
  ArrowRightIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { DocumentBadgeService } from '../services/documentBadgeService';
import { useNavigate } from 'react-router-dom';

interface PendingDocumentRequest {
  RequestID: string;
  RequestName: string;
  Description?: string;
  DueDate?: string;
  CreatedAt: string;
  Jobs: {
    JobID: string;
    JobName: string;
    ClientID: string;
  };
}

interface PendingDocumentsCardProps {
  clientId: string;
}

export default function PendingDocumentsCard({ clientId }: PendingDocumentsCardProps) {
  const [pendingRequests, setPendingRequests] = useState<PendingDocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (clientId && !isDismissed) {
      loadPendingRequests();
    }
  }, [clientId, isDismissed]);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await DocumentBadgeService.getPendingDocumentRequests(clientId);
      
      if (error) {
        console.error('Error loading pending document requests:', error);
        setError('Failed to load pending document requests');
        return;
      }

      setPendingRequests(data || []);
    } catch (err) {
      console.error('Error in loadPendingRequests:', err);
      setError('Failed to load pending document requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocuments = () => {
    navigate('/documents');
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'No date';
    }
  };

  const isOverdue = (dueDateString?: string) => {
    if (!dueDateString) return false;
    try {
      const dueDate = new Date(dueDateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    } catch {
      return false;
    }
  };

  // Don't show if loading, dismissed, or no pending requests
  if (loading || isDismissed || pendingRequests.length === 0) {
    return null;
  }

  const overdueCount = pendingRequests.filter(req => isOverdue(req.DueDate)).length;
  const urgentRequests = pendingRequests.slice(0, 3); // Show max 3 requests

  return (
    <motion.div
      className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-xl p-6 mb-6 shadow-lg"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-amber-900">
                Action Required: Pending Documents
              </h3>
              {overdueCount > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                  {overdueCount} Overdue
                </span>
              )}
            </div>
            
            <p className="text-amber-800 mb-4">
              You have <strong>{pendingRequests.length}</strong> document{pendingRequests.length !== 1 ? 's' : ''} 
              {' '}that need{pendingRequests.length === 1 ? 's' : ''} to be uploaded.
            </p>

            {/* Show urgent requests */}
            <div className="space-y-2 mb-4">
              {urgentRequests.map((request) => (
                <div 
                  key={request.RequestID}
                  className="bg-white/70 rounded-lg p-3 border border-amber-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <DocumentIcon className="w-4 h-4 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-900 text-sm">
                          {request.RequestName}
                        </p>
                        <p className="text-xs text-amber-700">
                          Job: {request.Jobs.JobName}
                        </p>
                      </div>
                    </div>
                    
                    {request.DueDate && (
                      <div className={`flex items-center space-x-1 text-xs ${
                        isOverdue(request.DueDate) ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        <ClockIcon className="w-3 h-3" />
                        <span>Due: {formatDate(request.DueDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {pendingRequests.length > 3 && (
                <p className="text-sm text-amber-700 italic">
                  +{pendingRequests.length - 3} more document{pendingRequests.length - 3 !== 1 ? 's' : ''} pending...
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleViewDocuments}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors flex items-center space-x-2"
              >
                <DocumentIcon className="w-4 h-4" />
                <span>Upload Documents</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleDismiss}
                className="text-amber-700 hover:text-amber-900 text-sm font-medium transition-colors"
              >
                Dismiss for now
              </button>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-amber-100 rounded-lg transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-amber-600" />
        </button>
      </div>
    </motion.div>
  );
}
