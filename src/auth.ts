import { getAuth } from 'firebase-admin/auth';

import firebase from './firebase';

export default getAuth(firebase);