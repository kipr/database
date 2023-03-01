import { readFileSync } from 'fs';
import * as crypto from 'crypto';

const serviceAccountKeyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_STRING;
const serviceAccountKeyFile = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE;

let serviceAccountKey;
if (serviceAccountKeyString) {
  serviceAccountKey = JSON.parse(serviceAccountKeyString);
} else if (serviceAccountKeyFile) {
  serviceAccountKey = JSON.parse(readFileSync(serviceAccountKeyFile, 'utf8'));
} else {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_STRING or FIREBASE_SERVICE_ACCOUNT_KEY_FILE must be set');
}

const googleStorageServiceAccountKeyString = process.env.GOOGLE_STORAGE_SERVICE_ACCOUNT_KEY_STRING;
const googleStorageServiceAccountKeyFile = process.env.GOOGLE_STORAGE_SERVICE_ACCOUNT_KEY_FILE;

let googleStorageServiceAccountKey;
if (googleStorageServiceAccountKeyString) {
  googleStorageServiceAccountKey = JSON.parse(googleStorageServiceAccountKeyString);
} else if (googleStorageServiceAccountKeyFile) {
  googleStorageServiceAccountKey = JSON.parse(readFileSync(googleStorageServiceAccountKeyFile, 'utf8'));
}

const databaseUrl = process.env.FIREBASE_DATABASE_URL;
if (!databaseUrl) throw new Error('FIREBASE_DATABASE_URL is not set');

let leaseKey = process.env.LEASE_KEY ? crypto.createSecretKey(process.env.LEASE_KEY, 'base64') : undefined;
if (!leaseKey) {
  console.log('WARNING: LEASE_KEY is not set. All leases will expire when this program exits.');
  crypto.generateKey('aes', { length: 256 }, (err, key) => {
    if (err) {
      console.error('Failed to generate lease key');
      throw err;
    }
    console.log('Generated lease key. Set LEASE_KEY to this value to persist leases.');
    leaseKey = key;
    config.lease.key = leaseKey;
  });
}

const googleStorageBucketName = process.env.GOOGLE_STORAGE_BUCKET_NAME;
// if (!googleStorageBucketName) throw new Error('GOOGLE_STORAGE_BUCKET_NAME is not set');

const googleStorageProjectId = process.env.GOOGLE_STORAGE_PROJECT_ID;
// if (!googleStorageProjectId) throw new Error('GOOGLE_STORAGE_PROJECT_ID is not set');

const config = {
  host: process.env.HOST || '127.0.0.1',
  port: process.env.PORT || 4000,
  firebase: {
    serviceAccountKey,
    databaseUrl,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  admin: {
    publicKey: process.env.ADMIN_PUBLIC_KEY,
  },
  googleStorage: {
    projectId: googleStorageProjectId,
    serviceAccountKey: googleStorageServiceAccountKey,
    bucketName: googleStorageBucketName,
  },
  lease: {
    key: leaseKey,
  }
};

export default config;