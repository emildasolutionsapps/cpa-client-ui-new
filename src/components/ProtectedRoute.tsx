import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  console.log('🛡️ ProtectedRoute check:', {
    loading,
    hasUser: !!user,
    userEmail: user?.email,
    currentPath: location.pathname
  })

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('⏳ Still loading auth state...')
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, redirect to login
  if (!user) {
    console.log('❌ No user found, redirecting to login from:', location.pathname)
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User is authenticated, render the protected content
  console.log('✅ User authenticated, rendering protected content')
  return <>{children}</>
}
