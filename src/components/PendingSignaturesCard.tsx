import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon, 
  PencilSquareIcon, 
  ArrowRightIcon,
  ClockIcon,
  XMarkIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';
import { SignatureBadgeService } from '../services/signatureBadgeService';
import { useNavigate } from 'react-router-dom';

interface PendingSignatureRequest {
  RequestID: string;
  DocumentName: string;
  Status: string;
  ExpiresAt?: string;
  CreatedAt: string;
  SignerEmail: string;
  SignerName: string;
  Jobs: {
    JobID: string;
    JobName: string;
    ClientID: string;
  };
}

interface PendingSignaturesCardProps {
  clientId: string;
}

export default function PendingSignaturesCard({ clientId }: PendingSignaturesCardProps) {
  const [pendingRequests, setPendingRequests] = useState<PendingSignatureRequest[]>([]);
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
      
      const { data, error } = await SignatureBadgeService.getPendingSignatureRequests(clientId);
      
      if (error) {
        console.error('Error loading pending signature requests:', error);
        setError('Failed to load pending signature requests');
        return;
      }

      setPendingRequests(data || []);
    } catch (err) {
      console.error('Error in loadPendingRequests:', err);
      setError('Failed to load pending signature requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSignatures = () => {
    navigate('/signatures');
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

  const isExpired = (expiresAtString?: string) => {
    if (!expiresAtString) return false;
    try {
      const expiresAt = new Date(expiresAtString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return expiresAt < today;
    } catch {
      return false;
    }
  };

  const isExpiringSoon = (expiresAtString?: string) => {
    if (!expiresAtString) return false;
    try {
      const expiresAt = new Date(expiresAtString);
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      return expiresAt <= threeDaysFromNow && expiresAt >= new Date();
    } catch {
      return false;
    }
  };

  // Don't show if loading, dismissed, or no pending requests
  if (loading || isDismissed || pendingRequests.length === 0) {
    return null;
  }

  const expiredCount = pendingRequests.filter(req => isExpired(req.ExpiresAt)).length;
  const expiringSoonCount = pendingRequests.filter(req => isExpiringSoon(req.ExpiresAt)).length;
  const urgentRequests = pendingRequests.slice(0, 3); // Show max 3 requests

  return (
    <motion.div
      className="bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500 rounded-xl p-6 mb-6 shadow-lg"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-purple-900">
                Action Required: Pending Signatures
              </h3>
              {expiredCount > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                  {expiredCount} Expired
                </span>
              )}
              {expiringSoonCount > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                  {expiringSoonCount} Expiring Soon
                </span>
              )}
            </div>
            
            <p className="text-purple-800 mb-4">
              You have <strong>{pendingRequests.length}</strong> document{pendingRequests.length !== 1 ? 's' : ''} 
              {' '}waiting for your signature.
            </p>

            {/* Show urgent requests */}
            <div className="space-y-2 mb-4">
              {urgentRequests.map((request) => (
                <div 
                  key={request.RequestID}
                  className="bg-white/70 rounded-lg p-3 border border-purple-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <PencilSquareIcon className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="font-medium text-purple-900 text-sm">
                          {request.DocumentName}
                        </p>
                        <p className="text-xs text-purple-700">
                          Job: {request.Jobs.JobName}
                        </p>
                        {request.Status === 'downloaded' && (
                          <div className="flex items-center space-x-1 text-xs text-purple-600 mt-1">
                            <CloudArrowDownIcon className="w-3 h-3" />
                            <span>Downloaded for offline signing</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {request.ExpiresAt && (
                      <div className={`flex items-center space-x-1 text-xs ${
                        isExpired(request.ExpiresAt) ? 'text-red-600' : 
                        isExpiringSoon(request.ExpiresAt) ? 'text-amber-600' : 'text-purple-600'
                      }`}>
                        <ClockIcon className="w-3 h-3" />
                        <span>
                          {isExpired(request.ExpiresAt) ? 'Expired: ' : 'Expires: '}
                          {formatDate(request.ExpiresAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {pendingRequests.length > 3 && (
                <p className="text-sm text-purple-700 italic">
                  +{pendingRequests.length - 3} more signature{pendingRequests.length - 3 !== 1 ? 's' : ''} pending...
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleViewSignatures}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <PencilSquareIcon className="w-4 h-4" />
                <span>Sign Documents</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleDismiss}
                className="text-purple-700 hover:text-purple-900 text-sm font-medium transition-colors"
              >
                Dismiss for now
              </button>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-purple-100 rounded-lg transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-purple-600" />
        </button>
      </div>
    </motion.div>
  );
}
