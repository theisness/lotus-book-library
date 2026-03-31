import {
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AwsClient } from 'aws4fetch';
import { env } from '../config/env.js';

const s3Client = new S3Client({
  forcePathStyle: true,
  region: env.s3.region,
  endpoint: env.s3.endpoint,
  credentials: {
    accessKeyId: env.s3.accessKeyId,
    secretAccessKey: env.s3.secretAccessKey,
  },
});

const s3PublicClient =
  env.s3.publicEndpoint && env.s3.publicEndpoint !== env.s3.endpoint
    ? new S3Client({
        forcePathStyle: true,
        region: env.s3.region,
        endpoint: env.s3.publicEndpoint,
        credentials: {
          accessKeyId: env.s3.accessKeyId,
          secretAccessKey: env.s3.secretAccessKey,
        },
      })
    : s3Client;

const getR2Client = () =>
  new AwsClient({
    service: 's3',
    region: env.r2.region,
    accessKeyId: env.r2.accessKeyId,
    secretAccessKey: env.r2.secretAccessKey,
  });

const getR2Url = () => `https://${env.r2.accountId}.r2.cloudflarestorage.com`;

const getStorageType = () => env.objectStorageType;

export const getDownloadSignedUrl = async (
  fileKey: string,
  expiresIn: number,
  bucketName?: string,
) => {
  const storageType = getStorageType();
  if (storageType === 'r2') {
    const bucket = bucketName || env.r2.bucketName;
    return (
      await getR2Client().sign(
        new Request(`${getR2Url()}/${bucket}/${fileKey}?X-Amz-Expires=${expiresIn}`),
        {
          aws: { signQuery: true },
        },
      )
    ).url.toString();
  }

  const bucket = bucketName || env.s3.bucketName;
  return await getSignedUrl(
    s3PublicClient,
    new GetObjectCommand({
      Bucket: bucket,
      Key: fileKey,
    }),
    { expiresIn },
  );
};

export const getUploadSignedUrl = async (
  fileKey: string,
  contentLength: number,
  expiresIn: number,
  bucketName?: string,
) => {
  const storageType = getStorageType();
  if (storageType === 'r2') {
    const bucket = bucketName || env.r2.bucketName;
    return (
      await getR2Client().sign(
        new Request(
          `${getR2Url()}/${bucket}/${fileKey}?X-Amz-Expires=${expiresIn}&X-Amz-SignedHeaders=content-length`,
          {
            method: 'PUT',
            headers: {
              'Content-Length': contentLength.toString(),
            },
          },
        ),
        {
          aws: { signQuery: true },
        },
      )
    ).url.toString();
  }

  const bucket = bucketName || env.s3.bucketName;
  const signableHeaders = new Set<string>();
  signableHeaders.add('content-length');
  return await getSignedUrl(
    s3PublicClient,
    new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentLength: contentLength,
    }),
    {
      expiresIn,
      signableHeaders,
    },
  );
};

export const deleteObject = async (fileKey: string, bucketName?: string) => {
  const storageType = getStorageType();
  if (storageType === 'r2') {
    const bucket = bucketName || env.r2.bucketName;
    return await getR2Client().fetch(`${getR2Url()}/${bucket}/${fileKey}`, {
      method: 'DELETE',
    });
  }

  const bucket = bucketName || env.s3.bucketName;
  return await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: fileKey,
    }),
  );
};
