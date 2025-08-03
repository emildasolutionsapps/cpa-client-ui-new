import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  setupMFA: () => Promise<{ qrCode: string; secret: string; error: AuthError | null }>
  verifyMFA: (token: string) => Promise<{ error: AuthError | null }>
  checkMFAStatus: () => Promise<{ enabled: boolean; error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    })
    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password,
    })
    return { error }
  }

  const setupMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      })
      
      if (error) return { qrCode: '', secret: '', error }
      
      return {
        qrCode: data.qr_code,
        secret: data.secret,
        error: null
      }
    } catch (error) {
      return { qrCode: '', secret: '', error: error as AuthError }
    }
  }

  const verifyMFA = async (token: string) => {
    try {
      const factors = await supabase.auth.mfa.listFactors()
      if (factors.error) return { error: factors.error }
      
      const totpFactor = factors.data.totp[0]
      if (!totpFactor) {
        return { error: { message: 'No TOTP factor found' } as AuthError }
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: token,
      })
      
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) return { enabled: false, error }
      
      return {
        enabled: data.totp.length > 0 && data.totp[0].status === 'verified',
        error: null
      }
    } catch (error) {
      return { enabled: false, error: error as AuthError }
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    setupMFA,
    verifyMFA,
    checkMFAStatus,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
