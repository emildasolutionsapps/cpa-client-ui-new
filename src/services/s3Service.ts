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
      }),
      forcePathStyle: false,
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

/**
 * Get the S3 key for client document uploads following the specification:
 * clients/(clientname+clientcode)/jobid/02_Requested_Documents/filename
 */
export const getClientDocumentKey = (
  clientName: string,
  clientCode: string,
  jobId: string,
  fileName: string,
): string => {
  const clientFolderName = createClientFolderName(clientName, clientCode);
  return `clients/${clientFolderName}/${jobId}/02_Requested_Documents/${fileName}`;
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

    await client.send(command);

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
    return {
      key: "",
      url: "",
      error: error.message || "Failed to upload file",
    };
  }
};

/**
 * Upload client document using the specification folder structure:
 * clients/(clientname+clientcode)/jobid/02_Requested_Documents/filename
 */
export const uploadClientDocument = async (
  file: File,
  clientName: string,
  clientCode: string,
  jobId: string,
  metadata?: Record<string, string>,
  onProgress?: (progress: S3UploadProgress) => void,
): Promise<S3UploadResult> => {
  try {
    // Use original filename for client uploads (no timestamp/random ID)
    const key = getClientDocumentKey(clientName, clientCode, jobId, file.name);

    // Upload the file using the standard upload function
    return await uploadFileToS3(file, key, {
      clientName,
      clientCode,
      jobId,
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
