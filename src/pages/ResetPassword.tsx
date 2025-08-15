import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { updatePassword } = useAuth()

  useEffect(() => {
    const handlePasswordReset = async () => {
      setSessionLoading(true)
      setError('')

      try {
        // Check if we have the required parameters for recovery
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')

        console.log('Password reset URL parameters:', { tokenHash, type, accessToken, refreshToken })

        if (tokenHash && type === 'recovery') {
          // Handle recovery link with token_hash
          console.log('Processing recovery link with token_hash:', tokenHash)
          
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          })

          if (error) {
            console.error('Recovery token verification error:', error)
            setError('Invalid or expired reset link. Please request a new password reset.')
            setHasValidSession(false)
          } else if (data.user) {
            console.log('Recovery token verified successfully:', data.user)
            setHasValidSession(true)
            setError('')
          } else {
            setError('Invalid or expired reset link. Please request a new password reset.')
            setHasValidSession(false)
          }
        } else if (accessToken && refreshToken && type === 'recovery') {
          // Handle legacy format with access_token and refresh_token
          console.log('Processing recovery link with access/refresh tokens')
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('Session setup error:', error)
            setError('Invalid or expired reset link. Please request a new password reset.')
            setHasValidSession(false)
          } else if (data.user) {
            console.log('Session established successfully:', data.user)
            setHasValidSession(true)
            setError('')
          } else {
            setError('Invalid or expired reset link. Please request a new password reset.')
            setHasValidSession(false)
          }
        } else {
          console.log('No valid recovery parameters found')
          setError('Invalid or expired reset link. Please request a new password reset.')
          setHasValidSession(false)
        }
      } catch (err) {
        console.error('Error processing password reset:', err)
        setError('An error occurred while processing your reset link. Please try again.')
        setHasValidSession(false)
      }

      setSessionLoading(false)
    }

    handlePasswordReset()
  }, [searchParams])

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    
    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers,
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers
    }
  }

  const passwordValidation = validatePassword(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (!passwordValidation.isValid) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and numbers')
      setLoading(false)
      return
    }

    try {
      const { error } = await updatePassword(password)
      
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        // Redirect to login after password reset
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying reset link...</p>
        </motion.div>
      </div>
    )
  }

  if (!hasValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <motion.div 
          className="w-full max-w-md text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            <div className="w-16 h-16 bg-red-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <LockClosedIcon className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Reset Link</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Request New Reset Link
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <motion.div 
          className="w-full max-w-md text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Password Reset Successful!</h1>
            <p className="text-slate-600 mb-6">Your password has been updated successfully. You will be redirected to login shortly.</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <motion.div 
                className="bg-emerald-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3 }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    )
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
            className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <LockClosedIcon className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset Your Password</h1>
          <p className="text-slate-600">Enter your new password below</p>
        </div>

        <motion.div 
          className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {error && (
            <motion.div 
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  placeholder="Enter your new password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {password && (
                <div className="mt-2 space-y-1">
                  <div className={`text-xs ${passwordValidation.minLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                    ✓ At least 8 characters
                  </div>
                  <div className={`text-xs ${passwordValidation.hasUpperCase ? 'text-emerald-600' : 'text-slate-400'}`}>
                    ✓ One uppercase letter
                  </div>
                  <div className={`text-xs ${passwordValidation.hasLowerCase ? 'text-emerald-600' : 'text-slate-400'}`}>
                    ✓ One lowercase letter
                  </div>
                  <div className={`text-xs ${passwordValidation.hasNumbers ? 'text-emerald-600' : 'text-slate-400'}`}>
                    ✓ One number
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  placeholder="Confirm your new password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating Password...
                </div>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  )
}
