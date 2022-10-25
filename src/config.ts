import { readFileSync } from 'fs';

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

const databaseUrl = process.env.FIREBASE_DATABASE_URL;
if (!databaseUrl) throw new Error('FIREBASE_DATABASE_URL is not set');

export default {
  port: process.env.PORT || 4000,
  firebase: {
    serviceAccountKey,
    databaseUrl,
  }
};