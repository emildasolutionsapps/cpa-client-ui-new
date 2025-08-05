import { supabase } from "../lib/supabase";

// Types for data structures
export interface Job {
  JobID: string;
  ClientID: string;
  ServiceTemplateID: string;
  ParentJobID?: string;
  LeadID?: string;
  JobName: string;
  CurrentStatusID: string;
  HasTaxMetrics: boolean;
  Priority?: string;
  DueDate?: string;
  TotalBudgetedHours?: number;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy?: string;
}

export interface Document {
  id: string;
  job_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  file_url: string;
  uploaded_by?: string;
  uploaded_at: string;
  tags?: string[];
  created_at: string;
}

export interface Message {
  id: string;
  client_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

// Data service class
export class DataService {
  // Fetch jobs for a specific client
  static async getJobsForClient(
    clientId: string,
  ): Promise<{ data: Job[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("Jobs")
        .select("*")
        .eq("ClientID", clientId)
        .order("CreatedAt", { ascending: false });

      if (error) {
        console.error("Error fetching jobs for client:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error in getJobsForClient:", error);
      return { data: null, error };
    }
  }

  // Fetch documents for a specific client (through jobs)
  static async getDocumentsForClient(
    clientId: string,
  ): Promise<{ data: Document[] | null; error: any }> {
    try {
      // First get all jobs for the client
      const { data: jobs, error: jobsError } = await this.getJobsForClient(
        clientId,
      );

      if (jobsError || !jobs || jobs.length === 0) {
        return { data: [], error: jobsError };
      }

      const jobIds = jobs.map((job) => job.JobID);

      // Then get documents for those jobs using correct table name
      const { data, error } = await supabase
        .from("Documents") // Updated to match admin app schema
        .select("*")
        .in("JobID", jobIds) // Updated column name
        .order("CreatedAt", { ascending: false }); // Updated column name

      if (error) {
        console.error("Error fetching documents for client:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error in getDocumentsForClient:", error);
      return { data: null, error };
    }
  }

  // Messages functionality moved to ChatService
  // This method is deprecated - use ChatService.getMessages() instead

  // Fetch billing information for a specific client
  static async getBillingForClient(
    clientId: string,
  ): Promise<{ data: any[] | null; error: any }> {
    try {
      // This would depend on your billing table structure
      // For now, returning empty array as placeholder
      return { data: [], error: null };
    } catch (error) {
      console.error("Error in getBillingForClient:", error);
      return { data: null, error };
    }
  }

  // Generic method to fetch any data filtered by client
  static async getDataForClient<T>(
    tableName: string,
    clientId: string,
    clientIdColumn: string = "ClientID",
  ): Promise<{ data: T[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq(clientIdColumn, clientId);

      if (error) {
        console.error(`Error fetching ${tableName} for client:`, error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error(`Error in getDataForClient for ${tableName}:`, error);
      return { data: null, error };
    }
  }
}
