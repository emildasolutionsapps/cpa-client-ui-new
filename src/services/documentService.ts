import { supabase } from "../lib/supabase";
import { uploadClientDocument } from "./s3Service";

// Types matching the admin app schema
export interface DocumentRecord {
  DocumentID: string;
  JobID: string;
  FileName: string;
  FileSize: number;
  DocumentType:
    | "Client Upload"
    | "Workpaper"
    | "Signed Document"
    | "Deliverable";
  Status: string;
  S3Path: string;
  UploadedBy: string;
  ClientCanSee: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface DocumentRequest {
  RequestID: string;
  JobID: string;
  RequestName: string;
  Description?: string;
  Status: "pending" | "uploaded" | "completed" | "cancelled";
  DueDate?: string;
  RequestedBy: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Job {
  JobID: string;
  ClientID: string;
  JobName: string;
  CurrentStatusID: string;
  DueDate?: string;
  CreatedAt: string;
}

export class DocumentService {
  // Get all jobs for a client
  static async getClientJobs(
    clientId: string,
  ): Promise<{ data: Job[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("Jobs")
        .select("JobID, ClientID, JobName, CurrentStatusID, DueDate, CreatedAt")
        .eq("ClientID", clientId)
        .order("CreatedAt", { ascending: false });

      if (error) {
        console.error("Error fetching client jobs:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error in getClientJobs:", error);
      return { data: null, error };
    }
  }

  // Get document requests for a client's jobs
  static async getDocumentRequests(
    clientId: string,
  ): Promise<{ data: DocumentRequest[] | null; error: any }> {
    try {
      // First get all jobs for the client
      const { data: jobs, error: jobsError } = await this.getClientJobs(
        clientId,
      );

      if (jobsError || !jobs || jobs.length === 0) {
        return { data: [], error: jobsError };
      }

      const jobIds = jobs.map((job) => job.JobID);

      // Get document requests for those jobs
      const { data, error } = await supabase
        .from("DocumentRequests")
        .select("*")
        .in("JobID", jobIds)
        .order("CreatedAt", { ascending: false });

      if (error) {
        console.error("Error fetching document requests:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error in getDocumentRequests:", error);
      return { data: null, error };
    }
  }

  // Get documents for a client's jobs
  static async getClientDocuments(
    clientId: string,
  ): Promise<{ data: DocumentRecord[] | null; error: any }> {
    try {
      // First get all jobs for the client
      const { data: jobs, error: jobsError } = await this.getClientJobs(
        clientId,
      );

      if (jobsError || !jobs || jobs.length === 0) {
        return { data: [], error: jobsError };
      }

      const jobIds = jobs.map((job) => job.JobID);

      // Get documents for those jobs that client can see
      const { data, error } = await supabase
        .from("Documents")
        .select("*")
        .in("JobID", jobIds)
        .eq("ClientCanSee", true)
        .order("CreatedAt", { ascending: false });

      if (error) {
        console.error("Error fetching client documents:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error in getClientDocuments:", error);
      return { data: null, error };
    }
  }

  // Upload document for a specific job
  static async uploadDocument(
    file: File,
    jobId: string,
    clientId: string,
    userId: string,
    clientName: string,
    clientCode: string,
  ): Promise<{ success: boolean; documentId?: string; error?: string }> {
    try {
      // Upload file to S3 using the proper client document structure
      const uploadResult = await uploadClientDocument(
        file,
        clientName,
        clientCode,
        jobId,
      );

      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      // TODO: Database record creation will be handled by 3rd party app
      // Commenting out for now - can be re-enabled later if needed
      /*
      const { data, error } = await supabase
        .from("Documents")
        .insert({
          JobID: jobId,
          FileName: file.name,
          FileSize: file.size,
          DocumentType: "Client Upload",
          Status: "uploaded",
          S3Path: uploadResult.key,
          UploadedBy: userId,
          ClientCanSee: true,
        })
        .select("DocumentID")
        .single();

      if (error) {
        console.error("Error creating document record:", error);
        throw error;
      }
      */

      return { success: true, documentId: `temp-client-${Date.now()}` };
    } catch (error) {
      console.error("Error in uploadDocument:", error);
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to upload document",
      };
    }
  }

  // Update document request status when client uploads
  static async updateDocumentRequestStatus(
    requestId: string,
    status: "uploaded" | "completed",
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("DocumentRequests")
        .update({ Status: status })
        .eq("RequestID", requestId);

      if (error) {
        console.error("Error updating document request status:", error);
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Error in updateDocumentRequestStatus:", error);
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to update request status",
      };
    }
  }

  // Get client info for S3 path generation
  static async getClientInfo(
    clientId: string,
  ): Promise<
    { data: { ClientName: string; ClientCode: string } | null; error: any }
  > {
    try {
      const { data, error } = await supabase
        .from("Clients")
        .select("ClientName, ClientCode")
        .eq("ClientID", clientId)
        .single();

      if (error) {
        console.error("Error fetching client info:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error in getClientInfo:", error);
      return { data: null, error };
    }
  }
}
