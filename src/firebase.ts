import { initializeApp, cert } from 'firebase-admin/app';
import config from './config';

const { serviceAccountKey, databaseUrl } = config.firebase;

export default initializeApp({
  credential: cert(serviceAccountKey),
  databaseURL: databaseUrl,
});