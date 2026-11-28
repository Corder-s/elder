/**
 * ElderCare OS — Provider-Independent S3-Compatible Object Storage Client
 * Uses @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner.
 * Server-side only; credentials are never exposed to clients and buckets remain private.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Config() {
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const region = process.env.S3_REGION?.trim() || 'ap-south-1';
  const bucket = process.env.S3_BUCKET?.trim() || 'eldercareos-tenant-storage';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim() || '';

  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

export function isS3Configured(): boolean {
  const { bucket, accessKeyId, secretAccessKey } = getS3Config();
  return Boolean(bucket && accessKeyId && secretAccessKey);
}

let cachedClient: S3Client | null = null;
let cachedConfigKey = '';

function getS3Client(): { client: S3Client; bucket: string } {
  const cfg = getS3Config();
  if (!cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) {
    throw new Error('Object storage credentials (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY) are not configured.');
  }
  const key = `${cfg.endpoint || ''}|${cfg.region}|${cfg.bucket}|${cfg.accessKeyId}`;
  if (!cachedClient || cachedConfigKey !== key) {
    cachedClient = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      forcePathStyle: Boolean(cfg.endpoint),
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
    cachedConfigKey = key;
  }
  return { client: cachedClient, bucket: cfg.bucket };
}

export async function generatePresignedUploadUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ url: string; expiresInSeconds: number }> {
  const { client, bucket } = getS3Client();
  const expiresInSeconds = Math.min(600, Math.max(60, params.expiresInSeconds ?? 300));
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
  });
  const url = await getSignedUrl(client, cmd, { expiresIn: expiresInSeconds });
  return { url, expiresInSeconds };
}

export async function generatePresignedDownloadUrl(params: {
  key: string;
  fileName: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ url: string; expiresInSeconds: number }> {
  const { client, bucket } = getS3Client();
  // Short-lived 1-5 minute download URL (default 180s = 3 minutes)
  const expiresInSeconds = Math.min(300, Math.max(60, params.expiresInSeconds ?? 180));
  const safeFileName = params.fileName.replace(/["\r\n]/g, '_');
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ResponseContentDisposition: `attachment; filename="${safeFileName}"`,
    ResponseContentType: params.contentType,
  });
  const url = await getSignedUrl(client, cmd, { expiresIn: expiresInSeconds });
  return { url, expiresInSeconds };
}

export async function headStorageObject(key: string): Promise<{
  exists: boolean;
  contentLength: number;
  contentType: string | null;
  etag: string | null;
}> {
  const { client, bucket } = getS3Client();
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      exists: true,
      contentLength: Number(res.ContentLength ?? 0),
      contentType: res.ContentType || null,
      etag: res.ETag || null,
    };
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
      return { exists: false, contentLength: 0, contentType: null, etag: null };
    }
    throw err;
  }
}

export async function getStorageObjectBuffer(key: string): Promise<Buffer> {
  const { client, bucket } = getS3Client();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) {
    throw new Error('Object body is empty');
  }
  const byteArray = await res.Body.transformToByteArray();
  return Buffer.from(byteArray);
}

export async function putStorageObject(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
}): Promise<void> {
  const { client, bucket } = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}

export async function deleteStorageObject(key: string): Promise<void> {
  const { client, bucket } = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
