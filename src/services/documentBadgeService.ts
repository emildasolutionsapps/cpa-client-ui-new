import { supabase } from "../lib/supabase";

export interface PendingDocumentCount {
  clientId: string;
  count: number;
}

// Simple event emitter for document badge updates
class DocumentBadgeEventEmitter {
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

export const documentBadgeEventEmitter = new DocumentBadgeEventEmitter();

export class DocumentBadgeService {
  // Get pending document request count for a client
  static async getPendingDocumentCount(clientId: string): Promise<number> {
    try {
      console.log(
        `DocumentBadgeService: Getting pending document count for client ${clientId}`,
      );

      // First get all jobs for the client
      const { data: jobs, error: jobsError } = await supabase
        .from("Jobs")
        .select("JobID")
        .eq("ClientID", clientId);

      if (jobsError || !jobs || jobs.length === 0) {
        console.log("DocumentBadgeService: No jobs found for client");
        return 0;
      }

      const jobIds = jobs.map((job) => job.JobID);
      console.log(
        `DocumentBadgeService: Found ${jobIds.length} jobs for client`,
      );

      // Count pending document requests for those jobs
      const { data: pendingRequests, error } = await supabase
        .from("DocumentRequests")
        .select("RequestID")
        .in("JobID", jobIds)
        .eq("Status", "pending");

      if (error) {
        console.error(
          "DocumentBadgeService: Error counting pending requests:",
          error,
        );
        return 0;
      }

      const count = pendingRequests?.length || 0;
      console.log(
        `DocumentBadgeService: Found ${count} pending document requests for client`,
        pendingRequests?.map(req => ({ id: req.RequestID, name: req.RequestName }))
      );
      return count;
    } catch (error) {
      console.error("DocumentBadgeService: Error getting pending count:", error);
      return 0;
    }
  }

  // Get detailed pending document requests for a client
  static async getPendingDocumentRequests(clientId: string): Promise<{
    data: any[] | null;
    error: any;
  }> {
    try {
      console.log(
        `DocumentBadgeService: Getting pending document requests for client ${clientId}`,
      );

      // Get pending document requests with job details
      const { data: pendingRequests, error } = await supabase
        .from("DocumentRequests")
        .select(`
          RequestID,
          RequestName,
          Description,
          DueDate,
          CreatedAt,
          Jobs!inner(JobID, JobName, ClientID)
        `)
        .eq("Jobs.ClientID", clientId)
        .eq("Status", "pending")
        .order("DueDate", { ascending: true, nullsLast: true });

      if (error) {
        console.error(
          "DocumentBadgeService: Error fetching pending requests:",
          error,
        );
        return { data: null, error };
      }

      console.log(
        `DocumentBadgeService: Found ${pendingRequests?.length || 0} pending requests`,
      );
      return { data: pendingRequests, error: null };
    } catch (error) {
      console.error("DocumentBadgeService: Error in getPendingDocumentRequests:", error);
      return { data: null, error };
    }
  }

  // Mark document request as uploaded (updates status)
  static async markRequestAsUploaded(requestId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase
        .from("DocumentRequests")
        .update({ Status: "uploaded" })
        .eq("RequestID", requestId);

      if (error) {
        console.error("DocumentBadgeService: Error updating request status:", error);
        return { success: false, error: error.message };
      }

      console.log(`DocumentBadgeService: Marked request ${requestId} as uploaded`);
      return { success: true };
    } catch (error) {
      console.error("DocumentBadgeService: Error in markRequestAsUploaded:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update status",
      };
    }
  }

  // Subscribe to real-time document request updates
  static subscribeToDocumentUpdates(
    clientId: string,
    callback: (count: number) => void,
  ) {
    console.log(
      `DocumentBadgeService: Setting up subscription for client ${clientId}`,
    );

    const channel = supabase.channel(`document-requests-${clientId}`);

    // Listen for changes to DocumentRequests table
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "DocumentRequests",
      },
      async (payload) => {
        console.log(
          "DocumentBadgeService: Document request change received:",
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
              "DocumentBadgeService: Change affects current client, updating count",
            );
            const count = await this.getPendingDocumentCount(clientId);
            callback(count);
          }
        }
      },
    );

    channel.subscribe();

    return {
      unsubscribe: () => {
        console.log(
          `DocumentBadgeService: Unsubscribing from document updates for client ${clientId}`,
        );
        supabase.removeChannel(channel);
      },
    };
  }

  // Emit event to trigger badge updates (for immediate updates)
  static emitBadgeUpdate(clientId: string) {
    documentBadgeEventEmitter.emit(clientId);
  }
}
