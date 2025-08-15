import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { BillingInformation as BillingInfo } from '../types/billing';
import { BillingService } from '../services/billingService';
import { BillingUtils } from '../utils/billingUtils';

interface BillingInformationProps {
  clientId: string;
}

export const BillingInformation: React.FC<BillingInformationProps> = ({ clientId }) => {
  const [billingInfo, setBillingInfo] = useState<BillingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBillingInformation();
  }, [clientId]);

  const loadBillingInformation = async () => {
    if (!clientId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await BillingService.getBillingInformation(clientId);
      
      if (response.success && response.data) {
        setBillingInfo(response.data);
      } else {
        setError(response.error || 'Failed to load billing information');
      }
    } catch (err) {
      console.error('Error loading billing information:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Error Loading Billing Information</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={loadBillingInformation}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (billingInfo.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="text-center py-8">
          <BuildingOfficeIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Billing Information</h3>
          <p className="text-slate-600">
            No billing information has been set up for your account yet. Please contact your CPA to add billing details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Billing Information</h2>
        <div className="text-sm text-slate-500">
          {billingInfo.length} billing {billingInfo.length === 1 ? 'address' : 'addresses'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {billingInfo.map((billing, index) => (
          <BillingCard key={billing.BillingInfoID} billing={billing} />
        ))}
      </div>
    </motion.div>
  );
};

interface BillingCardProps {
  billing: BillingInfo;
}

const BillingCard: React.FC<BillingCardProps> = ({ billing }) => {
  const status = BillingUtils.getBillingStatus(billing);
  const nickname = BillingUtils.generateBillingNickname(billing);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-slate-50 rounded-xl p-4 border-2 transition-all hover:shadow-md ${
        billing.IsDefault ? 'border-blue-200 bg-blue-50' : 'border-slate-200'
      }`}
    >
      {/* Default Badge */}
      {billing.IsDefault && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            <StarSolidIcon className="w-3 h-3" />
            <span>Default</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className={`p-2 rounded-lg ${
          billing.BillingCompanyName ? 'bg-blue-100' : 'bg-slate-100'
        }`}>
          {billing.BillingCompanyName ? (
            <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
          ) : (
            <UserIcon className="w-5 h-5 text-slate-600" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-slate-900 truncate">{nickname}</h3>
          <div className="flex items-center space-x-1">
            {status.isComplete ? (
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
            ) : (
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
            )}
            <span className={`text-sm font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-3">
        {/* Contact Name */}
        <div className="flex items-center space-x-3">
          <UserIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-700">{billing.BillingContactName}</span>
        </div>

        {/* Company Name */}
        {billing.BillingCompanyName && (
          <div className="flex items-center space-x-3">
            <BuildingOfficeIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-700">{billing.BillingCompanyName}</span>
          </div>
        )}

        {/* Email */}
        <div className="flex items-center space-x-3">
          <EnvelopeIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-700">{billing.BillingEmail}</span>
        </div>

        {/* Phone */}
        {billing.BillingPhone && (
          <div className="flex items-center space-x-3">
            <PhoneIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-700">
              {BillingUtils.formatPhoneNumber(billing.BillingPhone)}
            </span>
          </div>
        )}

        {/* Address */}
        <div className="flex items-start space-x-3">
          <MapPinIcon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {BillingUtils.formatAddressForDisplay(billing.BillingAddress)}
          </div>
        </div>

        {/* Tax ID */}
        {billing.TaxID && (
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-700">
              Tax ID: {BillingUtils.maskTaxID(billing.TaxID)}
            </span>
          </div>
        )}
      </div>

      {/* Notes */}
      {billing.BillingNotes && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="text-sm text-slate-600 italic">{billing.BillingNotes}</p>
        </div>
      )}
    </motion.div>
  );
};
