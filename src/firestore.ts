import { getFirestore } from 'firebase-admin/firestore';

import firebase from './firebase';

export default getFirestore(firebase);