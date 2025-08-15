import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { PaymentMethodsService } from '../services/paymentMethodsService';
import { PaymentEncryptionService } from '../services/paymentEncryptionService';
import {
  CreatePaymentMethodData,
  PaymentMethodFormStep,
  PaymentMethodFormState,
  CardBrand
} from '../types/paymentMethods';

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
}

export const AddPaymentMethodModal: React.FC<AddPaymentMethodModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId
}) => {
  const [formState, setFormState] = useState<PaymentMethodFormState>({
    step: 'type_selection',
    data: {
      clientId,
      paymentType: 'credit_card',
      isDefault: false,

    },
    errors: { isValid: true },
    loading: false
  });

  const [cardBrand, setCardBrand] = useState<CardBrand>('unknown');

  const resetForm = () => {
    setFormState({
      step: 'type_selection',
      data: {
        clientId,
        paymentType: 'credit_card',
        isDefault: false,

      },
      errors: { isValid: true },
      loading: false
    });
    setCardBrand('unknown');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeSelection = (type: 'credit_card' | 'debit_card' | 'bank_account' | 'ach') => {
    setFormState(prev => ({
      ...prev,
      step: 'details',
      data: { ...prev.data, paymentType: type }
    }));
  };

  const handleInputChange = (field: keyof CreatePaymentMethodData, value: any) => {
    setFormState(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value },
      errors: { isValid: true } // Clear errors on input change
    }));

    // Update card brand for card number changes
    if (field === 'cardNumber' && typeof value === 'string') {
      const brand = PaymentEncryptionService.getCardBrand(value);
      setCardBrand(brand);
    }
  };

  const handleSubmit = async () => {
    try {
      // First validate client-side
      const validation = PaymentMethodsService.validatePaymentMethodData(formState.data as CreatePaymentMethodData);
      console.log('Validation result:', validation);
      console.log('Form data:', formState.data);

      if (!validation.isValid) {
        setFormState(prev => ({
          ...prev,
          errors: validation
        }));
        return;
      }

      setFormState(prev => ({ ...prev, loading: true, errors: { isValid: true } }));

      const { data, error } = await PaymentMethodsService.addPaymentMethod(formState.data as CreatePaymentMethodData);

      if (error) {
        throw error;
      }

      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Error adding payment method:', err);
      setFormState(prev => ({
        ...prev,
        loading: false,
        errors: {
          isValid: false,
          error: err instanceof Error ? err.message : 'Failed to add payment method'
        }
      }));
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return PaymentEncryptionService.formatCardNumber(cleaned, cardBrand);
  };

  const handleCardNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    // Limit card number to 19 digits (longest card number)
    if (cleaned.length <= 19) {
      handleInputChange('cardNumber', cleaned);
    }
  };

  const handleCVVChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const brandInfo = PaymentEncryptionService.getCardBrandInfo(cardBrand);
    const maxLength = brandInfo?.code.size || 4;

    // Limit CVV to the appropriate length for the card brand
    if (cleaned.length <= maxLength) {
      handleInputChange('cvv', cleaned);
    }
  };

  const handleRoutingNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    // Routing numbers are exactly 9 digits
    if (cleaned.length <= 9) {
      handleInputChange('routingNumber', cleaned);
    }
  };

  const handleAccountNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    // Account numbers can be up to 17 digits
    if (cleaned.length <= 17) {
      handleInputChange('accountNumber', cleaned);
    }
  };

  const getCardBrandDisplay = (brand: CardBrand) => {
    const brandInfo = PaymentEncryptionService.getCardBrandInfo(brand);
    return brandInfo?.displayName || 'Unknown';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center">
            <ShieldCheckIcon className="w-5 h-5 mr-2 text-blue-600" />
            Add Payment Method
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error Message */}
          {!formState.errors.isValid && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start"
            >
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-700">{formState.errors.error}</p>
                {formState.errors.fieldErrors && (
                  <ul className="mt-1 text-xs text-red-600">
                    {Object.entries(formState.errors.fieldErrors).map(([field, error]) => (
                      <li key={field}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Payment Type Selection */}
            {formState.step === 'type_selection' && (
              <motion.div
                key="type_selection"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-medium text-slate-900 mb-4">Choose Payment Method Type</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleTypeSelection('credit_card')}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center space-x-3 text-left"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <CreditCardIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">Credit Card</h4>
                      <p className="text-sm text-slate-600">Visa, Mastercard, American Express, etc.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTypeSelection('debit_card')}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center space-x-3 text-left"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <CreditCardIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">Debit Card</h4>
                      <p className="text-sm text-slate-600">Bank debit card</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTypeSelection('bank_account')}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center space-x-3 text-left"
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <BuildingLibraryIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">Bank Account</h4>
                      <p className="text-sm text-slate-600">Direct bank account (ACH)</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Payment Details */}
            {formState.step === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-slate-900">Payment Details</h3>
                  <button
                    onClick={() => setFormState(prev => ({ ...prev, step: 'type_selection' }))}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Change Type
                  </button>
                </div>

                {(formState.data.paymentType === 'credit_card' || formState.data.paymentType === 'debit_card') && (
                  <div className="space-y-4">
                    {/* Card Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Card Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formState.data.cardNumber ? formatCardNumber(formState.data.cardNumber) : ''}
                          onChange={(e) => handleCardNumberChange(e.target.value.replace(/\s/g, ''))}
                          placeholder="1234 5678 9012 3456"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formState.errors.fieldErrors?.cardNumber ? 'border-red-300' : 'border-slate-300'
                          }`}
                          maxLength={23} // Formatted length with spaces
                        />
                        {cardBrand !== 'unknown' && (
                          <div className="absolute right-3 top-2 text-xs text-slate-500">
                            {getCardBrandDisplay(cardBrand)}
                          </div>
                        )}
                      </div>
                      {formState.errors.fieldErrors?.cardNumber && (
                        <p className="mt-1 text-xs text-red-600">{formState.errors.fieldErrors.cardNumber}</p>
                      )}
                    </div>

                    {/* Expiry and CVV */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Expiry Month
                        </label>
                        <select
                          value={formState.data.cardExpMonth || ''}
                          onChange={(e) => handleInputChange('cardExpMonth', parseInt(e.target.value))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formState.errors.fieldErrors?.cardExpMonth ? 'border-red-300' : 'border-slate-300'
                          }`}
                        >
                          <option value="">Month</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <option key={month} value={month}>
                              {month.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        {formState.errors.fieldErrors?.cardExpMonth && (
                          <p className="mt-1 text-xs text-red-600">{formState.errors.fieldErrors.cardExpMonth}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Expiry Year
                        </label>
                        <select
                          value={formState.data.cardExpYear || ''}
                          onChange={(e) => handleInputChange('cardExpYear', parseInt(e.target.value))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formState.errors.fieldErrors?.cardExpYear ? 'border-red-300' : 'border-slate-300'
                          }`}
                        >
                          <option value="">Year</option>
                          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                        {formState.errors.fieldErrors?.cardExpYear && (
                          <p className="mt-1 text-xs text-red-600">{formState.errors.fieldErrors.cardExpYear}</p>
                        )}
                      </div>
                    </div>
                    {formState.errors.fieldErrors?.cardExpiry && (
                      <p className="mt-1 text-xs text-red-600">{formState.errors.fieldErrors.cardExpiry}</p>
                    )}

                    {/* CVV */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={formState.data.cvv || ''}
                        onChange={(e) => handleCVVChange(e.target.value)}
                        placeholder={cardBrand === 'amex' ? '1234' : '123'}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formState.errors.fieldErrors?.cvv ? 'border-red-300' : 'border-slate-300'
                        }`}
                        maxLength={cardBrand === 'amex' ? 4 : 3}
                      />
                      {formState.errors.fieldErrors?.cvv && (
                        <p className="mt-1 text-xs text-red-600">{formState.errors.fieldErrors.cvv}</p>
                      )}
                    </div>

                    {/* Cardholder Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        value={formState.data.cardholderName || ''}
                        onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                        placeholder="John Doe"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formState.errors.fieldErrors?.cardholderName ? 'border-red-300' : 'border-slate-300'
                        }`}
                      />
                      {formState.errors.fieldErrors?.cardholderName && (
                        <p className="mt-1 text-xs text-red-600">{formState.errors.fieldErrors.cardholderName}</p>
                      )}
                    </div>
                  </div>
                )}

                {(formState.data.paymentType === 'bank_account' || formState.data.paymentType === 'ach') && (
                  <div className="space-y-4">
                    {/* Account Holder Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={formState.data.bankAccountHolderName || ''}
                        onChange={(e) => handleInputChange('bankAccountHolderName', e.target.value)}
                        placeholder="John Doe"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formState.errors.fieldErrors?.bankAccountHolderName ? 'border-red-300' : 'border-slate-300'
                        }`}
                      />
                      {formState.errors.fieldErrors?.bankAccountHolderName && (
                        <p className="mt-1 text-xs text-red-600">{formState.errors.fieldErrors.bankAccountHolderName}</p>
                      )}
                    </div>

                    {/* Account Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Account Type
                      </label>
                      <select
                        value={formState.data.bankAccountType || ''}
                        onChange={(e) => handleInputChange('bankAccountType', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formState.errors.fieldErrors?.bankAccountType ? 'border-red-300' : 'border-slate-300'
                        }`}
                      >
                        <option value="">Select Account Type</option>
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                      {formState.errors.fieldErrors?.bankAccountType && (
                        <p className="mt-1 text-xs text-red-600">{formState.errors.fieldErrors.bankAccountType}</p>
                      )}
                    </div>

                    {/* Routing Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Routing Number
                      </label>
                      <input
                        type="text"
                        value={formState.data.routingNumber || ''}
                        onChange={(e) => handleRoutingNumberChange(e.target.value)}
                        placeholder="123456789"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formState.errors.fieldErrors?.routingNumber ? 'border-red-300' : 'border-slate-300'
                        }`}
                        maxLength={9}
                      />
                      {formState.errors.fieldErrors?.routingNumber && (
                        <p className="mt-1 text-xs text-red-600">{formState.errors.fieldErrors.routingNumber}</p>
                      )}
                    </div>

                    {/* Account Number */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={formState.data.accountNumber || ''}
                        onChange={(e) => handleAccountNumberChange(e.target.value)}
                        placeholder="1234567890"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formState.errors.fieldErrors?.accountNumber ? 'border-red-300' : 'border-slate-300'
                        }`}
                        maxLength={17}
                      />
                      {formState.errors.fieldErrors?.accountNumber && (
                        <p className="mt-1 text-xs text-red-600">{formState.errors.fieldErrors.accountNumber}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Common Fields */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  {/* Nickname */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nickname (Optional)
                    </label>
                    <input
                      type="text"
                      value={formState.data.nickname || ''}
                      onChange={(e) => handleInputChange('nickname', e.target.value)}
                      placeholder="My Primary Card"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>


                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {formState.step === 'details' && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={formState.loading}
              className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={formState.loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {formState.loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Add Payment Method</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
