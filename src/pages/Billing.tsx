import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCardIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ShieldCheckIcon,
  StarIcon,
  CheckCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { CreditCardIcon as CreditCardSolidIcon } from '@heroicons/react/24/solid';
import { useClientData } from '../hooks/useClientData';

// Sample payment methods
const paymentMethods = [
  {
    id: 1,
    type: 'Visa',
    last4: '4242',
    expiryMonth: '12',
    expiryYear: '2027',
    isDefault: true,
    cardholderName: 'John Doe'
  },
  {
    id: 2,
    type: 'Mastercard',
    last4: '8888',
    expiryMonth: '08',
    expiryYear: '2026',
    isDefault: false,
    cardholderName: 'John Doe'
  }
];

// Sample receipts and invoices
const receipts = [
  {
    id: 1,
    type: 'invoice',
    number: 'INV-2025-001',
    description: '2025 Tax Preparation Services',
    amount: '$450.00',
    date: '2025-01-15',
    status: 'paid',
    downloadUrl: '#'
  },
  {
    id: 2,
    type: 'receipt',
    number: 'REC-2025-001',
    description: 'Payment for Tax Preparation',
    amount: '$450.00',
    date: '2025-01-15',
    status: 'completed',
    downloadUrl: '#'
  },
  {
    id: 3,
    type: 'invoice',
    number: 'INV-2024-012',
    description: '2024 Tax Return Amendment',
    amount: '$150.00',
    date: '2024-12-10',
    status: 'paid',
    downloadUrl: '#'
  },
  {
    id: 4,
    type: 'receipt',
    number: 'REC-2024-012',
    description: 'Payment for Tax Amendment',
    amount: '$150.00',
    date: '2024-12-10',
    status: 'completed',
    downloadUrl: '#'
  }
];

export default function Billing() {
  const [showAddCard, setShowAddCard] = useState(false);

  // Use client data hook
  const {
    billing,
    selectedClient,
    loadingBilling,
    billingError
  } = useClientData();

  // Show message if no client is selected
  if (!selectedClient) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <UserIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Client Selected</h2>
          <p className="text-slate-600">Please select a client profile from the sidebar to view billing information.</p>
        </div>
      </div>
    )
  }

  const handleDownload = (receipt: any) => {
    // In a real app, this would trigger a download
    console.log('Downloading:', receipt.number);
    // You could implement actual file download here
  };

  const handleDeleteCard = (cardId: number) => {
    // In a real app, this would delete the payment method
    console.log('Deleting card:', cardId);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Billing & Payment Methods</h1>

        {/* Payment Methods Section */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Payment Methods</h2>
            <button
              onClick={() => setShowAddCard(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add New Card</span>
            </button>
          </div>

          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <CreditCardIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-slate-900">{method.type} •••• {method.last4}</h3>
                      {method.isDefault && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">Expires {method.expiryMonth}/{method.expiryYear}</p>
                    <p className="text-slate-400 text-xs">{method.cardholderName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  {!method.isDefault && (
                    <button
                      onClick={() => handleDeleteCard(method.id)}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Receipts and Invoices Section */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Receipts & Invoices</h2>
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    receipt.type === 'invoice' ? 'bg-blue-50' : 'bg-emerald-50'
                  }`}>
                    <DocumentArrowDownIcon className={`w-5 h-5 ${
                      receipt.type === 'invoice' ? 'text-blue-600' : 'text-emerald-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-slate-900">{receipt.number}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        receipt.type === 'invoice'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {receipt.type}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm">{receipt.description}</p>
                    <p className="text-slate-500 text-xs">{receipt.date}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{receipt.amount}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      receipt.status === 'paid' || receipt.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {receipt.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(receipt)}
                      className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}