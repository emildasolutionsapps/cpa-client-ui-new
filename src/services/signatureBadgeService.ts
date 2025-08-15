import { supabase } from "../lib/supabase";

export interface PendingSignatureCount {
  clientId: string;
  count: number;
}

// Simple event emitter for signature badge updates
class SignatureBadgeEventEmitter {
  private listeners: ((clientId: string) => void)[] = [];

  subscribe(callback: (clientId: string) => void) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  emit(clientId: string) {
    this.listeners.forEach((callback) => callback(clientId));
  }
}

export const signatureBadgeEventEmitter = new SignatureBadgeEventEmitter();

export class SignatureBadgeService {
  // Get pending signature request count for a client
  static async getPendingSignatureCount(clientId: string): Promise<number> {
    try {
      console.log(
        `SignatureBadgeService: Getting pending signature count for client ${clientId}`,
      );

      // Get pending signature requests for the client
      const { data: pendingRequests, error } = await supabase
        .from("DocumentSigningRequests")
        .select(`
          RequestID,
          Status,
          Jobs!inner(JobID, JobName, ClientID)
        `)
        .eq("Jobs.ClientID", clientId)
        .in("Status", ["pending", "sent", "viewed"]) // Statuses that require action
        .order("CreatedAt", { ascending: false });

      if (error) {
        console.error(
          "SignatureBadgeService: Error counting pending requests:",
          error,
        );
        return 0;
      }

      const count = pendingRequests?.length || 0;
      console.log(
        `SignatureBadgeService: Found ${count} pending signature requests for client`,
        pendingRequests?.map(req => ({ 
          id: req.RequestID, 
          status: req.Status,
          job: req.Jobs.JobName 
        }))
      );
      return count;
    } catch (error) {
      console.error("SignatureBadgeService: Error getting pending count:", error);
      return 0;
    }
  }

  // Get detailed pending signature requests for a client
  static async getPendingSignatureRequests(clientId: string): Promise<{
    data: any[] | null;
    error: any;
  }> {
    try {
      console.log(
        `SignatureBadgeService: Getting pending signature requests for client ${clientId}`,
      );

      // Get pending signature requests with job details
      const { data: pendingRequests, error } = await supabase
        .from("DocumentSigningRequests")
        .select(`
          RequestID,
          DocumentName,
          Status,
          ExpiresAt,
          CreatedAt,
          SignerEmail,
          SignerName,
          Jobs!inner(JobID, JobName, ClientID)
        `)
        .eq("Jobs.ClientID", clientId)
        .in("Status", ["pending", "sent", "viewed"])
        .order("CreatedAt", { ascending: false });

      if (error) {
        console.error(
          "SignatureBadgeService: Error fetching pending requests:",
          error,
        );
        return { data: null, error };
      }

      console.log(
        `SignatureBadgeService: Found ${pendingRequests?.length || 0} pending signature requests`,
      );
      return { data: pendingRequests, error: null };
    } catch (error) {
      console.error("SignatureBadgeService: Error in getPendingSignatureRequests:", error);
      return { data: null, error };
    }
  }

  // Mark signature request as completed (updates status)
  static async markRequestAsCompleted(requestId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase
        .from("DocumentSigningRequests")
        .update({ 
          Status: "signed",
          SignedAt: new Date().toISOString(),
          UpdatedAt: new Date().toISOString()
        })
        .eq("RequestID", requestId);

      if (error) {
        console.error("SignatureBadgeService: Error updating request status:", error);
        return { success: false, error: error.message };
      }

      console.log(`SignatureBadgeService: Marked request ${requestId} as completed`);
      return { success: true };
    } catch (error) {
      console.error("SignatureBadgeService: Error in markRequestAsCompleted:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update status",
      };
    }
  }

  // Subscribe to real-time signature request updates
  static subscribeToSignatureUpdates(
    clientId: string,
    callback: (count: number) => void,
  ) {
    console.log(
      `SignatureBadgeService: Setting up subscription for client ${clientId}`,
    );

    const channel = supabase.channel(`signature-requests-${clientId}`);

    // Listen for changes to DocumentSigningRequests table
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "DocumentSigningRequests",
      },
      async (payload) => {
        console.log(
          "SignatureBadgeService: Signature request change received:",
          payload,
        );

        // Check if this change affects the current client
        if (payload.new?.JobID || payload.old?.JobID) {
          const jobId = payload.new?.JobID || payload.old?.JobID;
          
          // Check if this job belongs to the current client
          const { data: job } = await supabase
            .from("Jobs")
            .select("ClientID")
            .eq("JobID", jobId)
            .single();

          if (job?.ClientID === clientId) {
            console.log(
              "SignatureBadgeService: Change affects current client, updating count",
            );
            const count = await this.getPendingSignatureCount(clientId);
            callback(count);
          }
        }
      },
    );

    channel.subscribe();

    return {
      unsubscribe: () => {
        console.log(
          `SignatureBadgeService: Unsubscribing from signature updates for client ${clientId}`,
        );
        supabase.removeChannel(channel);
      },
    };
  }

  // Emit event to trigger badge updates (for immediate updates)
  static emitBadgeUpdate(clientId: string) {
    signatureBadgeEventEmitter.emit(clientId);
  }

  // Check if a signature request is expired
  static isExpired(request: any): boolean {
    if (!request.ExpiresAt) return false;
    return new Date(request.ExpiresAt) < new Date();
  }

  // Get status display information
  static getStatusInfo(status: string, isExpired: boolean = false): {
    label: string;
    color: string;
    description: string;
  } {
    if (isExpired && status === "pending") {
      return {
        label: "Expired",
        color: "red",
        description: "This document has expired and can no longer be signed",
      };
    }

    switch (status) {
      case "pending":
        return {
          label: "Pending",
          color: "orange",
          description: "Waiting for signature",
        };
      case "sent":
        return {
          label: "Sent",
          color: "blue",
          description: "Document sent for signature",
        };
      case "viewed":
        return {
          label: "Viewed",
          color: "purple",
          description: "Document has been viewed",
        };
      case "signed":
        return {
          label: "Signed",
          color: "green",
          description: "Document has been signed",
        };
      case "declined":
        return {
          label: "Declined",
          color: "red",
          description: "Signature was declined",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          color: "gray",
          description: "Signature request was cancelled",
        };
      default:
        return {
          label: status,
          color: "gray",
          description: "Unknown status",
        };
    }
  }
}
