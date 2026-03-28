import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const readestAppRoot = path.resolve(backendRoot, '../readest-app');

dotenv.config({ path: path.join(backendRoot, '.env') });
dotenv.config({ path: path.join(readestAppRoot, '.env.web'), override: false });
dotenv.config({ path: path.join(readestAppRoot, '.env'), override: false });

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const getOptionalBase64Env = (name: string): string | undefined => {
  const value = process.env[name];
  return value ? Buffer.from(value, 'base64').toString('utf8') : undefined;
};

const supabaseUrl =
  process.env['SUPABASE_URL'] ||
  process.env['NEXT_PUBLIC_SUPABASE_URL'] ||
  getOptionalBase64Env('NEXT_PUBLIC_DEFAULT_SUPABASE_URL_BASE64');
const supabaseAnonKey =
  process.env['SUPABASE_ANON_KEY'] ||
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
  getOptionalBase64Env('NEXT_PUBLIC_DEFAULT_SUPABASE_KEY_BASE64');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are not configured correctly.');
}

export const env = {
  nodeEnv: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['PORT'] || '4000', 10),
  host: process.env['BACKEND_HOST'] || '0.0.0.0',
  corsOrigin: process.env['CORS_ORIGIN'] || '*',
  protocol: process.env['PROTOCOL'] || 'http',
  publicHost: process.env['HOST'] || `localhost:${process.env['PORT'] || '4000'}`,
  supabaseUrl,
  supabaseAnonKey,
  supabaseAdminKey: getRequiredEnv('SUPABASE_ADMIN_KEY'),
  objectStorageType: (process.env['OBJECT_STORAGE_TYPE'] ||
    process.env['NEXT_PUBLIC_OBJECT_STORAGE_TYPE'] ||
    'r2') as 'r2' | 's3',
  r2: {
    accountId: process.env['R2_ACCOUNT_ID'] || '',
    region: process.env['R2_REGION'] || 'auto',
    accessKeyId: process.env['R2_ACCESS_KEY_ID'] || '',
    secretAccessKey: process.env['R2_SECRET_ACCESS_KEY'] || '',
    bucketName: process.env['R2_BUCKET_NAME'] || '',
  },
  s3: {
    endpoint: process.env['S3_ENDPOINT'] || '',
    region: process.env['S3_REGION'] || 'auto',
    accessKeyId: process.env['S3_ACCESS_KEY_ID'] || '',
    secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'] || '',
    bucketName: process.env['S3_BUCKET_NAME'] || '',
  },
  tempStoragePublicBucketName: process.env['TEMP_STORAGE_PUBLIC_BUCKET_NAME'] || '',
  publicStorageBaseUrl: process.env['READEST_PUBLIC_STORAGE_BASE_URL'] || '',
  storageFixedQuota: parseInt(process.env['STORAGE_FIXED_QUOTA'] || '0', 10),
  translationFixedQuota: parseInt(process.env['TRANSLATION_FIXED_QUOTA'] || '0', 10),
  deeplFreeApi: process.env['DEEPL_FREE_API'] || 'https://api-free.deepl.com/v2/translate',
  deeplProApi: process.env['DEEPL_PRO_API'] || 'https://api.deepl.com/v2/translate',
  deeplFreeApiKeys: process.env['DEEPL_FREE_API_KEYS'] || '',
  deeplProApiKeys: process.env['DEEPL_PRO_API_KEYS'] || '',
  deeplFingerprint: process.env['DEEPL_X_FINGERPRINT'] || '',
};
