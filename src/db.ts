import Selector from './model/Selector';
import collections from './collections';
import Get from './model/Get';
import Set from './model/Set';
import Delete from './model/Delete';
import Error from './model/Error';
import List from './model/List';
import firestore from './firestore';
import Cache from './Cache';

class Db {
  private cache_: Cache;

  constructor(cache: Cache) {
    this.cache_ = cache;
  }

  async get<T>({ selector }: Get.Request): Promise<Get.Response<T>> {
    if (!collections.has(selector.collection)) return {
      type: 'error',
      code: Error.CODE_NOT_FOUND,
      message: `Collection "${selector.collection}" is invalid.`,
    };

    try {
      const cached = await this.cache_.get(selector);
    
      if (cached) return {
        type: 'success',
        value: cached as T,
      };
    } catch (e) {
      console.error(e);
    }

    const doc = await firestore
      .collection(selector.collection)
      .doc(selector.id)
      .get();
    
    if (!doc.exists) return {
      type: 'error',
      code: Error.CODE_NOT_FOUND,
      message: `Document "${selector.id}" not found.`,
    };

    try {
      // Update the cache
      await this.cache_.set(selector, doc.data());
    } catch (e) {
      console.error(e);
    }

    return {
      type: 'success',
      value: doc.data() as T,
    };
  };

  async set({ selector, value }: Set.Request): Promise<Set.Response> {
    if (!collections.has(selector.collection)) return {
      type: 'error',
      code: Error.CODE_NOT_FOUND,
      message: `Collection "${selector.collection}" is invalid.`,
    };

    await firestore
      .collection(selector.collection)
      .doc(selector.id)
      .set(value);

    try {
      await this.cache_.set(selector, value);
    } catch (e) {
      console.error(e);
    }

    return {
      type: 'success',
    };
  }

  async delete({ selector }: Delete.Request): Promise<Delete.Response> {
    if (!collections.has(selector.collection)) return {
      type: 'error',
      code: Error.CODE_NOT_FOUND,
      message: `Collection "${selector.collection}" is invalid.`,
    };

    try {
      await this.cache_.remove(selector);
    } catch (e) {
      console.error(e);
    }

    await firestore
      .collection(selector.collection)
      .doc(selector.id)
      .delete();

    return {
      type: 'success',
    };
  }

  async list({ author, collection }: List.Request): Promise<List.Response> {
    if (!collections.has(collection)) return {
      type: 'error',
      code: Error.CODE_NOT_FOUND,
      message: `Collection "${collection}" is invalid.`,
    };

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