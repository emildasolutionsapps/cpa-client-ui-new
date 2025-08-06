import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCardIcon,
  BuildingLibraryIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { PaymentMethodsService } from '../services/paymentMethodsService';
import { AddPaymentMethodModal } from './AddPaymentMethodModal';
import {
  ClientPaymentMethod,
  PaymentMethodDisplay,
  PaymentMethodConstraints
} from '../types/paymentMethods';

interface PaymentMethodsListProps {
  clientId: string;
}

export const PaymentMethodsList: React.FC<PaymentMethodsListProps> = ({ clientId }) => {
  const [paymentMethods, setPaymentMethods] = useState<ClientPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, [clientId]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await PaymentMethodsService.getPaymentMethods(clientId);
      
      if (error) throw error;
      
      setPaymentMethods(data || []);
    } catch (err) {
      console.error('Error loading payment methods:', err);
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    await loadPaymentMethods();
    setIsAddModalOpen(false);
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      setSettingDefaultId(paymentMethodId);
      setError(null); // Clear any previous errors

      const { data, error } = await PaymentMethodsService.updatePaymentMethod(paymentMethodId, {
        isDefault: true
      });

      if (error) {
        console.error('Update payment method error:', error);
        throw new Error(error.message || 'Failed to set default payment method');
      }

      await loadPaymentMethods();
    } catch (err) {
      console.error('Error setting default payment method:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to set default payment method';
      setError(errorMessage);
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    // Get constraints first
    const constraints = await PaymentMethodsService.getPaymentMethodConstraints(paymentMethodId, clientId);
    
    if (!constraints.canDelete) {
      setError(constraints.reason || 'Cannot delete this payment method');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this payment method? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingMethodId(paymentMethodId);
      
      const { error } = await PaymentMethodsService.deletePaymentMethod(paymentMethodId);
      
      if (error) throw error;
      
      await loadPaymentMethods();
    } catch (err) {
      console.error('Error deleting payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete payment method');
    } finally {
      setDeletingMethodId(null);
    }
  };

  const getPaymentMethodIcon = (paymentType: string) => {
    switch (paymentType) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCardIcon className="w-5 h-5" />;
      case 'bank_account':
      case 'ach':
        return <BuildingLibraryIcon className="w-5 h-5" />;
      default:
        return <CreditCardIcon className="w-5 h-5" />;
    }
  };

  const formatPaymentMethodDisplay = (method: ClientPaymentMethod): PaymentMethodDisplay => {
    if (method.paymentType === 'credit_card' || method.paymentType === 'debit_card') {
      return {
        title: `${method.cardBrand || 'Card'} •••• ${method.cardLast4}`,
        subtitle: `Expires ${method.cardExpMonth}/${method.cardExpYear}`,
        holder: method.cardholderName || '',
        icon: 'card',
        brand: method.cardBrand
      };
    } else if (method.paymentType === 'bank_account' || method.paymentType === 'ach') {
      return {
        title: `Bank Account •••• ${method.bankAccountLast4 || method.cardLast4}`,
        subtitle: `${method.bankAccountType || 'Bank Account'}`,
        holder: method.bankAccountHolderName || method.cardholderName || '',
        icon: 'bank'
      };
    }
    return {
      title: 'Payment Method',
      subtitle: method.paymentType,
      holder: '',
      icon: 'card'
    };
  };

  const getPaymentMethodColor = (method: ClientPaymentMethod) => {
    if (method.paymentType === 'bank_account' || method.paymentType === 'ach') {
      return method.isDefault ? 'bg-purple-100 text-purple-600' : 'bg-purple-50 text-purple-600';
    }
    return method.isDefault ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center">
            <ShieldCheckIcon className="w-5 h-5 mr-2 text-blue-600" />
            Payment Methods
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage your payment methods for automatic billing
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add New</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start"
        >
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 hover:text-red-700 mt-1"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}

      {/* Payment Methods List */}
      {paymentMethods.length === 0 ? (
        <div className="text-center py-8">
          <CreditCardIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-900 mb-2">No Payment Methods</h4>
          <p className="text-slate-600 mb-4">
            Add a payment method to enable automatic billing and faster payments.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add First Payment Method</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((method) => {
            const display = formatPaymentMethodDisplay(method);
            const isDeleting = deletingMethodId === method.id;
            const isSettingDefault = settingDefaultId === method.id;
            
            return (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-xl p-4 transition-all relative ${
                  method.isDefault
                    ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 shadow-md ring-1 ring-blue-200'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {method.isDefault && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${getPaymentMethodColor(method)}`}>
                      {getPaymentMethodIcon(method.paymentType)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-slate-900">{display.title}</h3>
                        {method.isDefault && (
                          <div className="flex items-center space-x-1">
                            <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs rounded-full font-semibold flex items-center space-x-1 shadow-sm">
                              <StarSolidIcon className="w-3 h-3" />
                              <span>PRIMARY</span>
                            </span>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                        {method.nickname && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                            {method.nickname}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">{display.subtitle}</p>
                      {display.holder && (
                        <p className="text-slate-400 text-xs">{display.holder}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!method.isDefault && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        disabled={isSettingDefault}
                        className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-1"
                        title="Set as primary payment method"
                      >
                        {isSettingDefault ? (
                          <>
                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span>Setting...</span>
                          </>
                        ) : (
                          <>
                            <StarIcon className="w-3 h-3" />
                            <span>Set Primary</span>
                          </>
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeletePaymentMethod(method.id)}
                      disabled={isDeleting}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete payment method"
                    >
                      {isDeleting ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <TrashIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddPaymentMethod}
        clientId={clientId}
      />
    </div>
  );
};
