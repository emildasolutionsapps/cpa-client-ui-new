import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// Types for client data
interface Client {
  ClientID: string
  ClientName: string
  ClientCode: string
  ClientType?: string
  ClientStatus?: string
  Email?: string
  Phone?: string
  Address?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  // Client switching functionality
  availableClients: Client[]
  selectedClientId: string | null
  selectedClient: Client | null
  setSelectedClient: (clientId: string) => void
  loadingClients: boolean
  clientsError: string | null
  hasClientAccess: boolean
  // Auth methods
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

  // Client switching state
  const [availableClients, setAvailableClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [loadingClients, setLoadingClients] = useState(false)
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [hasClientAccess, setHasClientAccess] = useState(false)

  // Function to fetch user's permitted clients
  const fetchUserClients = async (userId: string) => {
    setLoadingClients(true)
    setClientsError(null)

    try {
      // Query UserClientAccess with JOIN to Clients table, filtering for active access only
      const { data, error } = await supabase
        .from('UserClientAccess')
        .select(`
          ClientID,
          IsActive,
          GrantedAt,
          RevokedAt,
          Clients!inner (
            ClientID,
            ClientName,
            ClientCode,
            ClientType,
            ClientStatus,
            Email,
            Phone,
            Address
          )
        `)
        .eq('UserID', userId)
        .eq('IsActive', true)
        .is('RevokedAt', null)

      if (error) {
        console.error('Error fetching user clients:', error)
        setClientsError('Failed to load client access. Please try again.')
        setHasClientAccess(false)
        return
      }

      // Extract client data from the join result
      const clients = data?.map(item => item.Clients).filter(Boolean) || []
      setAvailableClients(clients)

      if (clients.length > 0) {
        setHasClientAccess(true)
        // Set default selected client (first one) only if none is currently selected
        if (!selectedClientId) {
          const defaultClient = clients[0]
          setSelectedClientId(defaultClient.ClientID)
          setSelectedClient(defaultClient)
        }
      } else {
        // Handle case where user has no active client access
        console.warn('User has no active client access')
        setHasClientAccess(false)
        setClientsError('You do not have access to any client portals. Please contact your administrator.')
        setAvailableClients([])
        setSelectedClientId(null)
        setSelectedClient(null)
      }
    } catch (error) {
      console.error('Error in fetchUserClients:', error)
      setClientsError('An unexpected error occurred while loading client access.')
      setHasClientAccess(false)
      setAvailableClients([])
      setSelectedClientId(null)
      setSelectedClient(null)
    } finally {
      setLoadingClients(false)
    }
  }

  // Function to handle client switching
  const handleSetSelectedClient = (clientId: string) => {
    const client = availableClients.find(c => c.ClientID === clientId)
    if (client) {
      setSelectedClientId(clientId)
      setSelectedClient(client)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // If user is logged in, fetch their permitted clients
      if (session?.user) {
        fetchUserClients(session.user.id)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // If user logged in, fetch their clients
      if (session?.user) {
        fetchUserClients(session.user.id)
      } else {
        // Clear client data on logout
        setAvailableClients([])
        setSelectedClientId(null)
        setSelectedClient(null)
        setClientsError(null)
        setHasClientAccess(false)
      }
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
    // Client switching functionality
    availableClients,
    selectedClientId,
    selectedClient,
    setSelectedClient: handleSetSelectedClient,
    loadingClients,
    clientsError,
    hasClientAccess,
    // Auth methods
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
