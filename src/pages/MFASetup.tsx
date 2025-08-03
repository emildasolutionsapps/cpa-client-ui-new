import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ShieldCheckIcon, QrCodeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'

export default function MFASetup() {
  const [step, setStep] = useState(1)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { setupMFA, verifyMFA } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    initializeMFA()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initializeMFA = async () => {
    setLoading(true)
    try {
      const { qrCode, secret, error } = await setupMFA()
      
      if (error) {
        setError(error.message)
      } else {
        setQrCode(qrCode)
        setSecret(secret)
      }
    } catch {
      setError('Failed to initialize MFA setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await verifyMFA(verificationCode)
      
      if (error) {
        setError('Invalid verification code. Please try again.')
      } else {
        setStep(3)
        // Redirect to dashboard after success
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      }
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-8">
          <motion.div 
            className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <ShieldCheckIcon className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Setup Multi-Factor Authentication</h1>
          <p className="text-slate-600">Secure your account with an extra layer of protection</p>
        </div>

        <motion.div 
          className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 ${step >= 3 ? 'bg-emerald-600' : 'bg-slate-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                3
              </div>
            </div>
          </div>

          {error && (
            <motion.div 
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-6">
                <DevicePhoneMobileIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Step 1: Install Authenticator App</h2>
                <p className="text-slate-600 text-sm">
                  Download and install an authenticator app on your mobile device. We recommend:
                </p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    📱
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Google Authenticator</p>
                    <p className="text-slate-600 text-sm">Available on iOS and Android</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    🔐
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Authy</p>
                    <p className="text-slate-600 text-sm">Multi-device support</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
              >
                I've Installed an App
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-6">
                <QrCodeIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Step 2: Scan QR Code</h2>
                <p className="text-slate-600 text-sm">
                  Open your authenticator app and scan this QR code
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : qrCode ? (
                <div className="text-center mb-6">
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block mb-4">
                    <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-600 mb-2">Manual entry code:</p>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                      {secret}
                    </code>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-red-600">Failed to generate QR code. Please try again.</p>
                  <button
                    onClick={initializeMFA}
                    className="mt-4 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Enter 6-digit verification code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-center text-lg font-mono"
                    placeholder="000000"
                    maxLength={6}
                    disabled={loading}
                  />
                </div>

                <button
                  onClick={handleVerifyCode}
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Verifying...
                    </div>
                  ) : (
                    'Verify & Complete Setup'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <ShieldCheckIcon className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-lg font-semibold mb-2">MFA Setup Complete!</h2>
              <p className="text-slate-600 text-sm mb-6">
                Your account is now secured with multi-factor authentication. You'll be redirected to your dashboard shortly.
              </p>
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
