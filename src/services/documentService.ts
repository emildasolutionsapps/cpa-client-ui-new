import { supabase } from "../lib/supabase";
import { uploadClientDocument, uploadClientGeneralDocument } from "./s3Service";

// Types matching the admin app schema
export interface DocumentRecord {
  DocumentID: string;
  JobID: string;
  DocumentName: string; // Updated column name
  FileSize: number;
  DocumentType:
    | "Client Upload"
    | "Workpaper"
    | "Signed Document"
    | "Deliverable";
  Status: string;
  S3_Key: string; // Updated column name
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
    isRequestedDocument: boolean = false, // New parameter to distinguish upload types
  ): Promise<{ success: boolean; documentId?: string; error?: string }> {
    try {
      console.log("Starting client document upload:", {
        fileName: file.name,
        jobId,
        clientId,
        clientName,
        clientCode,
        userId,
      });

      // Get job details for proper folder naming
      const { data: jobData, error: jobError } = await supabase
        .from("Jobs")
        .select("JobName, JobCode")
        .eq("JobID", jobId)
        .single();

      if (jobError || !jobData) {
        console.warn(
          "Could not get job details, using fallback naming:",
          jobError,
        );
      }

      const jobTitle = jobData?.JobName || `job-${jobId}`;
      const jobCode = jobData?.JobCode || "UNKNOWN";

      // Try to upload file to S3 using the proper client document structure
      let uploadResult: any = null;
      let s3UploadSuccessful = false;

      try {
        // Use different upload functions based on document type
        if (isRequestedDocument) {
          // Requested documents go to 02_Requested_Documents folder
          uploadResult = await uploadClientDocument(
            file,
            clientName,
            clientCode,
            jobTitle,
            jobCode,
          );
        } else {
          // General uploads go to 01_Client_General_Uploads folder
          uploadResult = await uploadClientGeneralDocument(
            file,
            clientName,
            clientCode,
            jobTitle,
            jobCode,
          );
        }

        if (uploadResult.error) {
          console.warn(
            "S3 upload failed, will save to database only:",
            uploadResult.error,
          );
          s3UploadSuccessful = false;
        } else {
          console.log("S3 upload successful:", uploadResult.key);
          s3UploadSuccessful = true;

          // Copy file to workpapers folder for accountant use
          try {
            const { uploadToWorkpapers } = await import("./s3Service");
            const workpaperResult = await uploadToWorkpapers(
              file,
              clientName,
              clientCode,
              jobTitle,
              jobCode,
            );

            if (workpaperResult.error) {
              console.warn(
                "Failed to copy to workpapers folder:",
                workpaperResult.error,
              );
            } else {
              console.log(
                "File copied to workpapers folder:",
                workpaperResult.key,
              );
            }
          } catch (workpaperError) {
            console.warn("Error copying to workpapers folder:", workpaperError);
          }
        }
      } catch (s3Error) {
        console.warn(
          "S3 upload failed with exception, will save to database only:",
          s3Error,
        );
        s3UploadSuccessful = false;
      }

      // Create database record for the document (whether S3 upload succeeded or not)
      try {
        const documentRecord = {
          JobID: jobId,
          DocumentName: file.name, // Updated column name
          FileSize: file.size,
          DocumentType: "Client Upload", // Use display name format
          S3_Key: s3UploadSuccessful ? uploadResult.key : null, // Updated column name
          UploadedBy: userId,
          ClientCanSee: true,
        };

        const { data, error } = await supabase
          .from("Documents")
          .insert(documentRecord)
          .select("DocumentID")
          .single();

        if (error) {
          console.error("Error creating document record:", error);
          if (s3UploadSuccessful) {
            return {
              success: false,
              error:
                "Document uploaded to storage but database record creation failed. Please contact support.",
            };
          } else {
            return {
              success: false,
              error: "Both storage upload and database record creation failed.",
            };
          }
        }

        console.log(
          "Client document record created successfully:",
          data.DocumentID,
        );

        // Return success
        return {
          success: true,
          documentId: data.DocumentID,
        };
      } catch (dbError) {
        console.error("Database operation failed:", dbError);

        if (s3UploadSuccessful) {
          return {
            success: false,
            error:
              "Document uploaded to storage but database record creation failed. Please contact support.",
          };
        } else {
          return {
            success: false,
            error:
              "Document upload failed completely. Please check your connection and try again.",
          };
        }
      }
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

  // Send notification to job assignees when document is uploaded
  static async notifyDocumentUpload(data: {
    jobId: string;
    clientName: string;
    documentName: string;
    requestName: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "notify-document-upload",
        {
          body: data,
        },
      );

      if (error) {
        throw new Error(error.message || "Failed to send notification");
      }

      return { success: result?.success || true };
    } catch (error) {
      console.error("Error sending notification:", error);
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to send notification",
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
