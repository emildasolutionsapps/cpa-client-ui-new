import { supabase } from '../lib/supabase';

export interface SignatureRequest {
  RequestID: string;
  JobID?: string;
  DocumentName: string;
  DocumentURL?: string;
  BoldSignDocumentID: string;
  BoldSignEnvelopeID?: string;
  Status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired' | 'cancelled';
  SignerEmail: string;
  SignerName: string;
  ExpiresAt?: string;
  SignedAt?: string;
  DeclinedAt?: string;
  DeclineReason?: string;
  CallbackData?: any;
  CreatedAt: string;
  UpdatedAt: string;
  // Related data
  Job?: {
    JobID: string;
    JobName: string;
    ClientID: string;
  };
}

export class SignatureService {
  /**
   * Get signature requests for the current user
   */
  static async getSignatureRequests(userEmail?: string): Promise<{
    success: boolean;
    data?: SignatureRequest[];
    error?: string;
  }> {
    try {
      // Get current user if email not provided
      if (!userEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          return { success: false, error: 'User not authenticated' };
        }
        userEmail = user.email;
      }

      console.log('SignatureService: Fetching signature requests for:', userEmail);

      const { data, error } = await supabase
        .from('DocumentSigningRequests')
        .select(`
          *,
          Jobs(JobID, JobName, ClientID)
        `)
        .eq('SignerEmail', userEmail)
        .order('CreatedAt', { ascending: false });

      if (error) {
        console.error('SignatureService: Error fetching requests:', error);
        return { success: false, error: error.message };
      }

      console.log('SignatureService: Found', data?.length || 0, 'signature requests');
      return { success: true, data: data || [] };

    } catch (error) {
      console.error('SignatureService: Exception in getSignatureRequests:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch signature requests'
      };
    }
  }

  /**
   * Get signing URL from BoldSign for a specific request
   */
  static async getSigningUrl(requestId: string): Promise<{
    success: boolean;
    signingUrl?: string;
    error?: string;
  }> {
    try {
      console.log('SignatureService: Getting signing URL for request:', requestId);

      const { data: request, error } = await supabase
        .from('DocumentSigningRequests')
        .select('*')
        .eq('RequestID', requestId)
        .single();

      if (error || !request) {
        return { success: false, error: 'Signature request not found' };
      }

      // Extract signing URL from CallbackData
      const callbackData = request.CallbackData;
      if (callbackData && callbackData.signingUrl) {
        return { success: true, signingUrl: callbackData.signingUrl };
      }

      // If no signing URL in callback data, try to construct it
      // BoldSign typically provides signing URLs in the format:
      // https://app.boldsign.com/document/sign/{documentId}?signerToken={token}
      if (callbackData && callbackData.signerToken) {
        const signingUrl = `https://app.boldsign.com/document/sign/${request.BoldSignDocumentID}?signerToken=${callbackData.signerToken}`;
        return { success: true, signingUrl };
      }

      return { success: false, error: 'Signing URL not available' };

    } catch (error) {
      console.error('SignatureService: Error getting signing URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get signing URL'
      };
    }
  }

  /**
   * Update signature request status (for local updates)
   */
  static async updateRequestStatus(requestId: string, status: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase
        .from('DocumentSigningRequests')
        .update({
          Status: status,
          UpdatedAt: new Date().toISOString()
        })
        .eq('RequestID', requestId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      console.error('SignatureService: Error updating status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status'
      };
    }
  }

  /**
   * Check if a signature request is expired
   */
  static isExpired(request: SignatureRequest): boolean {
    if (!request.ExpiresAt) return false;
    return new Date(request.ExpiresAt) < new Date();
  }

  /**
   * Get status display information
   */
  static getStatusInfo(request: SignatureRequest): {
    label: string;
    color: string;
    description: string;
  } {
    const isExpired = this.isExpired(request);
    
    if (isExpired && request.Status === 'pending') {
      return {
        label: 'Expired',
        color: 'red',
        description: 'This document has expired and can no longer be signed'
      };
    }

    switch (request.Status) {
      case 'signed':
        return {
          label: 'Signed',
          color: 'green',
          description: 'Document has been successfully signed'
        };
      case 'pending':
      case 'sent':
        return {
          label: 'Pending',
          color: 'yellow',
          description: 'Waiting for your signature'
        };
      case 'viewed':
        return {
          label: 'Viewed',
          color: 'blue',
          description: 'Document has been viewed but not yet signed'
        };
      case 'declined':
        return {
          label: 'Declined',
          color: 'red',
          description: request.DeclineReason || 'Document signing was declined'
        };
      case 'expired':
        return {
          label: 'Expired',
          color: 'red',
          description: 'Document has expired and can no longer be signed'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: 'gray',
          description: 'Document signing was cancelled'
        };
      default:
        return {
          label: 'Unknown',
          color: 'gray',
          description: 'Unknown status'
        };
    }
  }
}
