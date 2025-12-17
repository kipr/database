import Selector from './model/Selector';
import collections from './collections';
import Get from './model/Get';
import Set from './model/Set';
import Delete from './model/Delete';
import Error from './model/Error';
import List from './model/List';
import firestore from './firestore';
import Cache from './Cache';
import { CHALLENGE_COMPLETION_COLLECTION, FILE_COLLECTION, PROJECT_COLLECTION, USER_COLLECTION, USER_VERIFICATION_COLLECTION } from './model/constants';

const USER_ID_REQUIRED = new Set([
  CHALLENGE_COMPLETION_COLLECTION,
  USER_VERIFICATION_COLLECTION,
  PROJECT_COLLECTION,
]);

class Db {
  private cache_: Cache;

  constructor(cache: Cache) {
    this.cache_ = cache;
  }

  private static toFirebaseCollection_({ selector, userId }: { selector: Selector; userId?: string; }): string {
    if (!collections.has(selector.collection)) throw {
      type: 'error',
      code: Error.CODE_NOT_FOUND,
      message: `Collection "${selector.collection}" is invalid.`
    } as Error;

    let fCollection = selector.collection;
    let needsUserPrefix = USER_ID_REQUIRED.has(selector.collection);

    // For files, we need to nest them under their project
    if (selector.collection === FILE_COLLECTION) {
      if (!selector.subCollectionIds || !selector.subCollectionIds.projectId) throw {
        type: 'error',
        message: 'Project ID is required for this collection.',
        code: Error.CODE_NOT_AUTHORIZED,
      } as Error;

      fCollection = `${PROJECT_COLLECTION}/${selector.subCollectionIds.projectId}/${fCollection}`;
      // Files are nested under projects, which require user prefix
      needsUserPrefix = true;
    }

    // For certain collections, we need to nest them under their user
    if (needsUserPrefix) {
      if (!userId) throw {
        type: 'error',
        message: 'User ID is required for this collection.',
        code: Error.CODE_NOT_AUTHORIZED,
      } as Error;

      fCollection = `${USER_COLLECTION}/${userId}/${fCollection}`;
    }

    return fCollection;
  }



  async get<T>({ selector, userId }: Get.Request): Promise<Get.Response<T>> {
    let fCollection: string;
    try {
      fCollection = Db.toFirebaseCollection_({ selector, userId });
    } catch (e) {
      return e as Error;
    }

    const cacheSelector: Selector = { ...selector, collection: fCollection };
    
    try {
      const cached = await this.cache_.get(cacheSelector);
    
      if (cached) return {
        type: 'success',
        value: cached as T,
      };
    } catch (e) {
      console.error(e);
    }

    const doc = await firestore
      .collection(fCollection)
      .doc(selector.id)
      .get();
    
    if (!doc.exists) return {
      type: 'error',
      code: Error.CODE_NOT_FOUND,
      message: `Document "${selector.id}" not found.`,
    };

    try {
      // Update the cache
      await this.cache_.set(cacheSelector, doc.data());
    } catch (e) {
      console.error(e);
    }

    return {
      type: 'success',
      value: doc.data() as T,
    };
  };

  async set({ selector, userId, value, partialUpdate }: Set.Request): Promise<Set.Response> {
    let fCollection: string;
    try {
      fCollection = Db.toFirebaseCollection_({ selector, userId });
    } catch (e) {
      return e as Error;
    }

    const docRef = firestore
      .collection(fCollection)
      .doc(selector.id);
    
    const cacheSelector: Selector = { ...selector, collection: fCollection };
    
    if (partialUpdate) {
      // Only replace the fields that are present in the value

      // To update the cache, we'd have to either 1) compute the full doc manually, or 2) fetch the updated doc from firestore
      // Instead, just delete the cache entry and let it repopulate on next read
      await this.cache_.remove(cacheSelector);

      const keysToReplace = Object.keys(value);
      await docRef.set(value, { mergeFields: keysToReplace });
    } else {
      await docRef.set(value);

      try {
        await this.cache_.set(cacheSelector, value);
      } catch (e) {
        console.error(e);
      }
    }

    return {
      type: 'success',
    };
  }

  async delete({ selector, userId }: Delete.Request): Promise<Delete.Response> {
    let fCollection: string;
    try {
      fCollection = Db.toFirebaseCollection_({ selector, userId });
    } catch (e) {
      return e as Error;
    }

    const cacheSelector: Selector = { ...selector, collection: fCollection };

    try {
      await this.cache_.remove(cacheSelector);
    } catch (e) {
      console.error(e);
    }

    await firestore
      .collection(fCollection)
      .doc(selector.id)
      .delete();

    return {
      type: 'success',
    };
  }

  async list({ author, collection, subCollectionIds, userId }: List.Request): Promise<List.Response> {
    if (!collections.has(collection)) return {
      type: 'error',
      code: Error.CODE_NOT_FOUND,
      message: `Collection "${collection}" is invalid.`,
    };

    // Special handling for files nested under projects
    if (collection === FILE_COLLECTION) {
      if (!subCollectionIds || !subCollectionIds.projectId) {
        return {
          type: 'error',
          code: Error.CODE_NOT_AUTHORIZED,
          message: 'Project ID is required to list files.',
        };
      }

      const fCollection = Db.toFirebaseCollection_({
        selector: { collection, id: '', subCollectionIds },
        userId
      });

      const docs = await firestore
        .collection(fCollection)
        .where('author.id', '==', author.id)
        .get();

      const values = {};
      for (const doc of docs.docs) values[doc.id] = doc.data();

      return { type: 'success', values };
    }

    // Special handling for projects (nested under users)
    if (USER_ID_REQUIRED.has(collection)) {
      if (!userId) {
        return {
          type: 'error',
          code: Error.CODE_NOT_AUTHORIZED,
          message: 'User ID is required for this collection.',
        };
      }

      const fCollection = `${USER_COLLECTION}/${userId}/${collection}`;
      const docs = await firestore
        .collection(fCollection)
        .where('author.id', '==', author.id)
        .get();

      const values = {};
      for (const doc of docs.docs) values[doc.id] = doc.data();

      return { type: 'success', values };
    }

    // Special handling for challenge_completion
    if (collection === CHALLENGE_COMPLETION_COLLECTION) {
      const challengeRef = firestore.collectionGroup('challenge_completion')
      const challengeSnapshot = await challengeRef.get();
      const groupData = {};
      const userData = {};
      challengeSnapshot.forEach((doc) => {
        const id = doc.ref.parent.parent.id;
        const data = doc.data();
        if (author.id !== id) {
          if (groupData[id]) {
            groupData[id][doc.id] = data;
            return;
          }
          groupData[id] = {[doc.id]: doc.data()};
        } else {
          if (userData[id]) {
            userData[id][doc.id] = data;
            return;
          }
          userData[id] = {[doc.id]: doc.data()};
        }
      });
      const values = {
        groupData,
        userData,
      };
      return {
        type: 'success',
        values: values,
      };
    }

    // Default: top-level collections
    const docs = await firestore
      .collection(collection)
      .where('author.id', '==', author.id)
      .get();

    const values = {};
    for (const doc of docs.docs) values[doc.id] = doc.data();

    return {
      type: 'success',
      values,
    };
  }
}

export default Db;