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
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
    console.log("🔧 S3 Client Configuration:", {
      hasAccessKey: !!S3_ACCESS_KEY_ID,
      accessKeyLength: S3_ACCESS_KEY_ID?.length,
      hasSecretKey: !!S3_SECRET_ACCESS_KEY,
      secretKeyLength: S3_SECRET_ACCESS_KEY?.length,
      bucket: S3_BUCKET_NAME,
      region: S3_REGION,
    });

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
      // Remove custom requestHandler - use AWS SDK defaults for better browser compatibility
      forcePathStyle: false,
      maxAttempts: 3, // Retry failed requests up to 3 times
    });
  }
  return s3Client;
};

/**
 * Test S3 connection and credentials
 */
export const testS3Connection = async (): Promise<
  { success: boolean; error?: string }
> => {
  try {
    console.log("🧪 Testing S3 connection...");
    const client = getS3Client();

    // Try to list objects in the bucket (minimal operation)
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      MaxKeys: 1, // Just get 1 object to test connection
    });

    const response = await client.send(command);
    console.log("✅ S3 connection test successful:", {
      bucket: S3_BUCKET_NAME,
      objectCount: response.KeyCount || 0,
    });

    return { success: true };
  } catch (error: any) {
    console.error("❌ S3 connection test failed:", error);
    return {
      success: false,
      error: error.message || "Unknown S3 connection error",
    };
  }
};

/**
 * Upload file using presigned URL (CORS-free approach)
 */
export const uploadFileWithPresignedUrl = async (
  file: File,
  key: string,
  metadata?: Record<string, string>,
  onProgress?: (progress: S3UploadProgress) => void,
): Promise<S3UploadResult> => {
  try {
    console.log("🔄 Uploading file using presigned URL approach...");

    // Step 1: Get presigned URL from backend
    const presignedResponse = await fetch("/api/s3/presigned-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        contentType: file.type,
        metadata,
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error("Failed to get presigned URL");
    }

    const { uploadUrl, fields } = await presignedResponse.json();

    // Step 2: Upload directly to S3 using presigned URL
    const formData = new FormData();

    // Add all the fields from presigned URL
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value as string);
    });

    // Add the file last
    formData.append("file", file);

    // Upload with progress tracking
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    console.log("✅ Presigned URL upload successful");

    return {
      key,
      url: `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${key}`,
      error: null,
    };
  } catch (error: any) {
    console.error("❌ Presigned URL upload failed:", error);
    return {
      key: "",
      url: "",
      error: error.message || "Failed to upload with presigned URL",
    };
  }
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
 * Upload large file using multipart upload for better reliability
 */
const uploadLargeFileMultipart = async (
  file: File,
  key: string,
  metadata?: Record<string, string>,
  client?: S3Client,
): Promise<S3UploadResult> => {
  try {
    const s3Client = client || getS3Client();

    console.log("🔄 Starting multipart upload...");

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: file, // Use File directly - AWS SDK handles browser compatibility
        ContentType: file.type,
        Metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size.toString(),
          uploadMethod: "multipart",
          ...metadata,
        },
      },
      // Use minimal multipart settings for better compatibility
      partSize: 5 * 1024 * 1024, // 5MB parts (minimum allowed)
      queueSize: 1, // Sequential upload to avoid connection issues
    });

    // Add progress tracking
    upload.on("httpUploadProgress", (progress) => {
      if (progress.loaded && progress.total) {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        console.log(
          `📊 Upload progress: ${percentage}% (${progress.loaded}/${progress.total} bytes)`,
        );
      }
    });

    const result = await upload.done();
    console.log("✅ Multipart upload completed successfully");

    // Generate a presigned URL for accessing the file
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 }); // 1 hour

    return {
      key,
      url,
      error: null,
    };
  } catch (error: any) {
    console.error("❌ Multipart upload failed:", error);
    return {
      key: "",
      url: "",
      error: error.message || "Multipart upload failed",
    };
  }
};

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

    // For files >5MB, use multipart upload (required for large files)
    if (file.size > 5 * 1024 * 1024) { // 5MB threshold for multipart
      console.log(
        "🚀 Using multipart upload for file >5MB:",
        file.size,
        "bytes",
      );
      return await uploadLargeFileMultipart(file, key, metadata, client);
    }

    // For smaller files, use regular upload with buffer
    console.log("📦 Using regular upload for file:", file.size, "bytes");
    if (file.size > 1024 * 1024) {
      console.log("⚠️ Large file detected - this may take a moment to process");
    }

    // Convert File to ArrayBuffer and then to Uint8Array for browser compatibility
    const arrayBuffer = await file.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);

    // Report progress
    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percentage: 0 });
    }

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: file.type,
      ContentLength: file.size,
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size.toString(),
        uploadMethod: "buffer", // Always use buffer in browser environment
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
          // Wait before retrying (longer delays for large files)
          const baseDelay = file.size > 1024 * 1024 ? 5000 : 2000; // 5s for large files, 2s for small
          const delay = Math.pow(2, attempt - 1) * baseDelay; // 5s, 10s for large files
          console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/3)`);
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
        "🚫 CORS ERROR: Client app cannot upload to S3 directly from localhost",
      );
      console.error("💡 SOLUTION: Add localhost to S3 CORS policy:");
      console.error(
        "   AllowedOrigins: ['http://localhost:5173', 'http://localhost:3000']",
      );
      console.error("📍 Current Origin:", window.location.origin);
      console.error("📦 S3 Bucket:", S3_BUCKET_NAME);
      console.error("🌍 S3 Region:", S3_REGION);
      console.error("🔑 Upload Key:", key);
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
  requestName?: string, // New parameter for smart naming
): Promise<S3UploadResult> => {
  try {
    // Generate smart filename for requested documents
    let fileName = file.name;
    if (requestName) {
      // Create safe filename from request name (remove special characters)
      const safeRequestName = requestName.replace(/[^a-zA-Z0-9\-_]/g, '_').substring(0, 50);
      const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
      const originalNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      fileName = `req-${safeRequestName}-${originalNameWithoutExt}${fileExtension}`;
    }

    // Use proper job folder naming with smart filename
    const key = getClientDocumentKey(
      clientName,
      clientCode,
      jobTitle,
      jobCode,
      fileName,
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
  smartFileName?: string, // New parameter to use smart filename if provided
): Promise<S3UploadResult> => {
  try {
    const clientFolderName = createClientFolderName(clientName, clientCode);
    const jobFolderName = createJobFolderName(jobTitle, jobCode);
    const fileName = smartFileName || file.name; // Use smart filename if provided
    const key =
      `clients/${clientFolderName}/${jobFolderName}/05_Internal_Workpapers/${fileName}`;

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
