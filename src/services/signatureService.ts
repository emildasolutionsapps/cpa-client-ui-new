import { supabase } from "../lib/supabase";

export interface SignatureRequest {
  RequestID: string;
  JobID?: string;
  DocumentName: string;
  DocumentURL?: string;
  BoldSignDocumentID: string;
  BoldSignEnvelopeID?: string;
  Status:
    | "pending"
    | "sent"
    | "viewed"
    | "signed"
    | "declined"
    | "expired"
    | "cancelled";
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
  // Client-side properties
  signingUrl?: string;
}

export class SignatureService {
  /**
   * Get signature requests for the selected client/job (not user-specific)
   */
  static async getSignatureRequests(options?: {
    clientId?: string;
    jobId?: string;
  }): Promise<{
    success: boolean;
    data?: SignatureRequest[];
    error?: string;
  }> {
    try {
      const { clientId, jobId } = options || {};

      console.log(
        "SignatureService: Fetching signature requests for:",
        clientId ? `client: ${clientId}` : "all clients",
        jobId ? `job: ${jobId}` : "all jobs",
      );

      let query = supabase
        .from("DocumentSigningRequests")
        .select(`
          *,
          Jobs!inner(JobID, JobName, ClientID)
        `)
        .order("CreatedAt", { ascending: false });

      // Filter by client if provided
      if (clientId) {
        query = query.eq("Jobs.ClientID", clientId);
      }

      // Filter by specific job if provided
      if (jobId) {
        query = query.eq("JobID", jobId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("SignatureService: Error fetching requests:", error);
        return { success: false, error: error.message };
      }

      console.log(
        "SignatureService: Found",
        data?.length || 0,
        "signature requests",
      );
      console.log("SignatureService: Raw data:", data);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error(
        "SignatureService: Exception in getSignatureRequests:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to fetch signature requests",
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
      console.log(
        "SignatureService: Getting signing URL for request:",
        requestId,
      );

      const { data: request, error } = await supabase
        .from("DocumentSigningRequests")
        .select("*")
        .eq("RequestID", requestId)
        .single();

      if (error || !request) {
        return { success: false, error: "Signature request not found" };
      }

      console.log("SignatureService: Found request:", request);

      // First try to get signing URL from CallbackData (legacy)
      const callbackData = request.CallbackData;
      if (callbackData && callbackData.signingUrl) {
        return { success: true, signingUrl: callbackData.signingUrl };
      }

      // If no signing URL in callback data, get it from BoldSign API
      if (request.BoldSignDocumentID && request.SignerEmail) {
        console.log("SignatureService: Fetching signing URL from BoldSign API");

        const response = await fetch(
          `https://cjgzilrlesuiaxtexnfk.supabase.co/functions/v1/boldsign-api/signing-url`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              documentId: request.BoldSignDocumentID,
              signerEmail: request.SignerEmail,
            }),
          },
        );

        const result = await response.json();
        console.log("SignatureService: BoldSign API response:", result);

        if (result.success && result.signingUrl) {
          return { success: true, signingUrl: result.signingUrl };
        } else {
          return {
            success: false,
            error: result.error || "Failed to get signing URL from BoldSign",
          };
        }
      }

      return {
        success: false,
        error:
          "Signing URL not available - missing document ID or signer email",
      };
    } catch (error) {
      console.error("SignatureService: Error getting signing URL:", error);
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to get signing URL",
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
        .from("DocumentSigningRequests")
        .update({
          Status: status,
          UpdatedAt: new Date().toISOString(),
        })
        .eq("RequestID", requestId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("SignatureService: Error updating status:", error);
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to update status",
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

    if (isExpired && request.Status === "pending") {
      return {
        label: "Expired",
        color: "red",
        description: "This document has expired and can no longer be signed",
      };
    }

    switch (request.Status) {
      case "signed":
        return {
          label: "Signed",
          color: "green",
          description: "Document has been successfully signed",
        };
      case "pending":
      case "sent":
        return {
          label: "Pending",
          color: "yellow",
          description: "Waiting for your signature",
        };
      case "viewed":
        return {
          label: "Viewed",
          color: "blue",
          description: "Document has been viewed but not yet signed",
        };
      case "declined":
        return {
          label: "Declined",
          color: "red",
          description: request.DeclineReason || "Document signing was declined",
        };
      case "expired":
        return {
          label: "Expired",
          color: "red",
          description: "Document has expired and can no longer be signed",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          color: "gray",
          description: "Document signing was cancelled",
        };
      default:
        return {
          label: "Unknown",
          color: "gray",
          description: "Unknown status",
        };
    }
  }
}
