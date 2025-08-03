import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ShieldCheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'

export default function MFAVerify() {
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  
  const { user, verifyMFA, checkMFAStatus, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in and has MFA enabled
    const checkUserMFA = async () => {
      if (!user) {
        navigate('/login')
        return
      }

      const { enabled, error } = await checkMFAStatus()
      if (error) {
        console.error('Error checking MFA status:', error)
        navigate('/login')
        return
      }

      if (!enabled) {
        // User doesn't have MFA set up, redirect to setup
        navigate('/mfa-setup')
      }
    }

    checkUserMFA()
  }, [user, navigate, checkMFAStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await verifyMFA(verificationCode)
      
      if (error) {
        if (error.message.includes('Invalid TOTP code')) {
          setError('Invalid verification code. Please check your authenticator app and try again.')
        } else {
          setError(error.message)
        }
      } else {
        // MFA verification successful, redirect to dashboard
        navigate('/dashboard')
      }
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = async () => {
    await signOut()
    navigate('/login')
  }

  const handleResendCode = async () => {
    setResendLoading(true)
    // In a real implementation, you might want to trigger a new MFA challenge
    // For now, we'll just show a message
    setTimeout(() => {
      setResendLoading(false)
      setError('')
      // You could show a success message here
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-md"
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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Two-Factor Authentication</h1>
          <p className="text-slate-600">Enter the 6-digit code from your authenticator app</p>
        </div>

        <motion.div 
          className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                className="bg-red-50 border border-red-200 rounded-xl p-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-red-700 text-sm">{error}</p>
              </motion.div>
            )}

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
              <p className="text-slate-600 text-sm">
                Open your authenticator app and enter the current 6-digit code
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 text-center">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-center text-2xl font-mono tracking-widest"
                placeholder="000000"
                maxLength={6}
                disabled={loading}
                autoComplete="one-time-code"
              />
              <p className="text-xs text-slate-500 text-center mt-2">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 rounded-xl font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify & Continue'
              )}
            </button>

            <div className="text-center space-y-3">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
              >
                {resendLoading ? 'Requesting...' : 'Having trouble? Get help'}
              </button>
              
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full text-slate-600 hover:text-slate-800 transition-colors flex items-center justify-center text-sm"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                Back to Login
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-medium text-slate-900 mb-2">Security Tips:</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Codes refresh every 30 seconds</li>
                <li>• Make sure your device time is accurate</li>
                <li>• Keep your authenticator app updated</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
