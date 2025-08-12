/**
 * S3 Service for Client Portal - File upload functionality
 * Copied from admin portal for standalone functionality
 */

import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";

// Environment variables for S3 configuration
const S3_ACCESS_KEY_ID = import.meta.env.VITE_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = import.meta.env.VITE_S3_SECRET_ACCESS_KEY;
const S3_BUCKET_NAME = import.meta.env.VITE_S3_BUCKET_NAME ||
  "cpa-test-taxreturn-drafts";
const S3_REGION = import.meta.env.VITE_S3_REGION || "ap-south-1";

// S3 Client configuration
let s3Client: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (!s3Client) {
    if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      throw new Error(
        "File storage credentials not configured. Please contact your system administrator.",
      );
    }

    s3Client = new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      requestHandler: new FetchHttpHandler({
        keepAlive: true,
        requestTimeout: 30000, // 30 seconds timeout
      }),
      forcePathStyle: false,
      maxAttempts: 3, // Retry failed requests up to 3 times
    });
  }
  return s3Client;
};

// S3 Operations Interface
export interface S3UploadResult {
  key: string;
  url: string;
  error?: string;
}

export interface S3FileInfo {
  key: string;
  size: number;
  lastModified: Date;
  url?: string;
}

export interface S3UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Validate file before upload
 */
export const validateFile = (
  file: File,
): { valid: boolean; error?: string } => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "text/plain",
    "text/csv",
  ];

  if (file.size > maxSize) {
    return { valid: false, error: "File size must be less than 50MB" };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error:
        "File type not supported. Please upload PDF, Word, Excel, Image, or Text files.",
    };
  }

  return { valid: true };
};

/**
 * Create a slugified string for folder names
 */
const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

/**
 * Create client folder name following the specification
 */
export const createClientFolderName = (
  clientName: string,
  clientCode: string,
): string => {
  const slugifiedName = slugify(clientName);
  return `${slugifiedName}-${clientCode}`;
};

export const createJobFolderName = (
  jobTitle: string,
  jobCode: string,
): string => {
  const slugifiedTitle = slugify(jobTitle);
  // New format: jobTitle-[jobCode] (human readable + short code in brackets)
  return `${slugifiedTitle}-[${jobCode}]`;
};

/**
 * Find existing job folder by searching for job code pattern
 */
export const findExistingJobFolder = async (
  clientFolderName: string,
  jobCode: string,
): Promise<{ folderName: string | null; error?: string }> => {
  try {
    const client = getS3Client();
    const prefix = `clients/${clientFolderName}/`;

    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: prefix,
      Delimiter: "/",
      MaxKeys: 100,
    });

    const response = await client.send(command);

    if (response.CommonPrefixes) {
      // Look for folder that ends with [jobCode]
      const jobCodePattern = `[${jobCode}]`;
      const matchingFolder = response.CommonPrefixes.find((prefix) =>
        prefix.Prefix?.includes(jobCodePattern)
      );

      if (matchingFolder) {
        // Extract just the folder name (remove prefix and trailing slash)
        const folderName = matchingFolder.Prefix!
          .replace(`clients/${clientFolderName}/`, "")
          .replace("/", "");
        return { folderName };
      }
    }

    return { folderName: null };
  } catch (error: any) {
    console.error("Error finding existing job folder:", error);
    return { folderName: null, error: error.message };
  }
};

/**
 * Get the S3 key for client document uploads using new job folder structure:
 * clients/(clientname+clientcode)/jobname-[jobcode]/02_Requested_Documents/filename
 */
export const getClientDocumentKey = (
  clientName: string,
  clientCode: string,
  jobTitle: string,
  jobCode: string,
  fileName: string,
): string => {
  const clientFolderName = createClientFolderName(clientName, clientCode);
  const jobFolderName = createJobFolderName(jobTitle, jobCode);
  return `clients/${clientFolderName}/${jobFolderName}/02_Requested_Documents/${fileName}`;
};

/**
 * Legacy function for backward compatibility - tries to find job folder by job ID
 */
export const getClientDocumentKeyLegacy = async (
  clientName: string,
  clientCode: string,
  jobId: string,
  fileName: string,
): Promise<{ key: string | null; error?: string }> => {
  try {
    // Try to find the job folder by looking up job info
    const { supabase } = await import("../lib/supabase");
    const { data: job, error } = await supabase
      .from("Jobs")
      .select("JobName, JobCode")
      .eq("JobID", jobId)
      .single();

    if (error || !job) {
      // Fallback to old structure for legacy jobs
      const clientFolderName = createClientFolderName(clientName, clientCode);
      return {
        key:
          `clients/${clientFolderName}/${jobId}/02_Requested_Documents/${fileName}`,
        error: "Using legacy folder structure - job not found in database",
      };
    }

    // Use new structure with job code
    const jobCode = job.JobCode || "LEGACY";
    const key = getClientDocumentKey(
      clientName,
      clientCode,
      job.JobName,
      jobCode,
      fileName,
    );
    return { key };
  } catch (error: any) {
    console.error("Error getting client document key:", error);
    return {
      key: null,
      error: error.message || "Failed to get document key",
    };
  }
};

/**
 * Get the S3 key for client general uploads:
 * clients/(clientname+clientcode)/jobfolder/01_Client_General_Uploads/filename
 */
export const getClientGeneralUploadKey = (
  clientName: string,
  clientCode: string,
  jobTitle: string,
  jobCode: string,
  fileName: string,
): string => {
  const clientFolderName = createClientFolderName(clientName, clientCode);
  const jobFolderName = createJobFolderName(jobTitle, jobCode);
  return `clients/${clientFolderName}/${jobFolderName}/01_Client_General_Uploads/${fileName}`;
};

/**
 * Upload file to S3 with validation
 */
export const uploadFileToS3 = async (
  file: File,
  key: string,
  metadata?: Record<string, string>,
  onProgress?: (progress: S3UploadProgress) => void,
): Promise<S3UploadResult> => {
  try {
    // Validate file first
    const validation = validateFile(file);
    if (!validation.valid) {
      return {
        key: "",
        url: "",
        error: validation.error,
      };
    }

    const client = getS3Client();

    // Convert File to ArrayBuffer and then to Uint8Array for browser compatibility
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Report progress
    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percentage: 0 });
    }

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: uint8Array,
      ContentType: file.type,
      ContentLength: file.size,
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        ...metadata,
      },
    });

    // Add retry logic for browser uploads
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await client.send(command);
        console.log(`S3 upload successful on attempt ${attempt}`);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        console.warn(`S3 upload attempt ${attempt} failed:`, error);

        if (attempt < 3) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // All attempts failed, throw the last error
          throw lastError;
        }
      }
    }

    // Report completion
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    // Generate a presigned URL for accessing the file
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(client, getCommand, { expiresIn: 3600 }); // 1 hour

    return {
      key,
      url,
    };
  } catch (error: any) {
    console.error("Error uploading file to S3:", error);

    // Log more detailed error information
    if (
      error.name === "TypeError" && error.message.includes("Failed to fetch")
    ) {
      console.error(
        "CORS or network error detected. Check S3 CORS configuration and network connectivity.",
      );
      console.error("S3 Bucket:", S3_BUCKET_NAME);
      console.error("S3 Region:", S3_REGION);
      console.error("Upload Key:", key);
    }

    return {
      key: "",
      url: "",
      error: error.message || "Failed to upload file",
    };
  }
};

/**
 * Upload client document using the new job folder structure:
 * clients/(clientname+clientcode)/jobname-[jobcode]/02_Requested_Documents/filename
 */
export const uploadClientDocument = async (
  file: File,
  clientName: string,
  clientCode: string,
  jobTitle: string,
  jobCode: string,
  metadata?: Record<string, string>,
  onProgress?: (progress: S3UploadProgress) => void,
): Promise<S3UploadResult> => {
  try {
    // Use proper job folder naming
    const key = getClientDocumentKey(
      clientName,
      clientCode,
      jobTitle,
      jobCode,
      file.name,
    );

    // Upload the file using the standard upload function
    return await uploadFileToS3(file, key, {
      clientName,
      clientCode,
      jobTitle,
      jobCode,
      originalFileName: file.name,
      uploadType: "client_document",
      ...metadata,
    }, onProgress);
  } catch (error: any) {
    console.error("Error uploading client document:", error);
    return {
      key: "",
      url: "",
      error: error.message || "Failed to upload client document",
    };
  }
};

/**
 * Upload client general document using the general uploads folder structure:
 * clients/(clientname+clientcode)/jobfolder/01_Client_General_Uploads/filename
 */
export const uploadClientGeneralDocument = async (
  file: File,
  clientName: string,
  clientCode: string,
  jobTitle: string,
  jobCode: string,
  metadata?: Record<string, string>,
  onProgress?: (progress: S3UploadProgress) => void,
): Promise<S3UploadResult> => {
  try {
    // Use original filename for client uploads (no timestamp/random ID)
    const key = getClientGeneralUploadKey(
      clientName,
      clientCode,
      jobTitle,
      jobCode,
      file.name,
    );

    // Upload the file using the standard upload function
    return await uploadFileToS3(file, key, {
      clientName,
      clientCode,
      jobTitle,
      jobCode,
      originalFileName: file.name,
      uploadType: "client_general_upload",
      ...metadata,
    }, onProgress);
  } catch (error: any) {
    console.error("Error uploading client general document:", error);
    return {
      key: "",
      url: "",
      error: error.message || "Failed to upload client general document",
    };
  }
};

/**
 * Get presigned URL for file access
 */
export const getPresignedUrl = async (
  key: string,
  expiresIn: number = 3600,
): Promise<{ url: string; error?: string }> => {
  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return { url };
  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    return {
      url: "",
      error: error.message || "Failed to generate presigned URL",
    };
  }
};

/**
 * List files in a specific job folder directory for client app
 */
export const listJobFolderFiles = async (
  jobId: string,
  folderType: string, // '01_Client_General_Uploads', '02_Requested_Documents', etc.
): Promise<{
  files: Array<{
    key: string;
    name: string;
    size: number;
    lastModified: Date;
    contentType?: string;
  }>;
  error?: string;
}> => {
  try {
    // Get job and client information
    const { supabase } = await import("../lib/supabase");
    const { data: job, error: jobError } = await supabase
      .from("Jobs")
      .select(`
        JobName,
        JobCode,
        Clients!inner(ClientName, ClientCode)
      `)
      .eq("JobID", jobId)
      .single();

    if (jobError || !job || !job.Clients) {
      return {
        files: [],
        error: `Failed to get job information: ${jobError?.message}`,
      };
    }

    const clientName = job.Clients.ClientName;
    const clientCode = job.Clients.ClientCode;
    const jobCode = job.JobCode;
    const jobName = job.JobName;

    if (!jobCode) {
      return {
        files: [],
        error: "Job code is missing - cannot locate job folder",
      };
    }

    // Build the S3 prefix - first try to find existing folder
    const clientFolderName = createClientFolderName(clientName, clientCode);

    // Try to find existing job folder first
    const existingFolder = await findExistingJobFolder(
      clientFolderName,
      jobCode,
    );
    const jobFolderName = existingFolder.folderName ||
      createJobFolderName(jobName, jobCode);

    const prefix =
      `clients/${clientFolderName}/${jobFolderName}/${folderType}/`;

    console.log("Listing files with prefix:", prefix);

    // List objects in S3
    const client = getS3Client();
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 100, // Reasonable limit
    });

    const response = await client.send(command);

    if (!response.Contents) {
      return { files: [] };
    }

    // Filter out folder placeholders and format results
    const files = response.Contents
      .filter((obj) => obj.Key && !obj.Key.endsWith("/.folder-placeholder"))
      .map((obj) => ({
        key: obj.Key!,
        name: obj.Key!.split("/").pop() || obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        contentType: obj.ContentType,
      }))
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()); // Sort by newest first

    console.log(`Found ${files.length} files in ${folderType}`);
    return { files };
  } catch (error: any) {
    console.error("Error listing job folder files:", error);
    return {
      files: [],
      error: error.message || "Failed to list files",
    };
  }
};

/**
 * Upload file to workpapers folder for accountant use
 */
export const uploadToWorkpapers = async (
  file: File,
  clientName: string,
  clientCode: string,
  jobTitle: string,
  jobCode: string,
  metadata?: Record<string, string>,
): Promise<S3UploadResult> => {
  try {
    const clientFolderName = createClientFolderName(clientName, clientCode);
    const jobFolderName = createJobFolderName(jobTitle, jobCode);
    const key =
      `clients/${clientFolderName}/${jobFolderName}/05_Internal_Workpapers/${file.name}`;

    return await uploadFileToS3(file, key, {
      clientName,
      clientCode,
      jobTitle,
      jobCode,
      originalFileName: file.name,
      uploadType: "workpaper_copy",
      ...metadata,
    });
  } catch (error: any) {
    console.error("Error uploading to workpapers:", error);
    return {
      key: "",
      url: "",
      error: error.message || "Failed to upload to workpapers",
    };
  }
};
