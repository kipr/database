import {
  SCENE_COLLECTION,
  CHALLENGE_COLLECTION,
  CHALLENGE_COMPLETION_COLLECTION,
  BIG_STORE_COLLECTION,
  USER_VERIFICATION_COLLECTION
} from './constants';

interface Selector {
  collection: string;
  id: string;
}

namespace Selector {
  export const scene = (id: string): Selector => ({
    collection: SCENE_COLLECTION,
    id,
  });

  export const challenge = (id: string): Selector => ({
    collection: CHALLENGE_COLLECTION,
    id,
  });

  export const challengeCompletion = (id: string): Selector => ({
    collection: CHALLENGE_COMPLETION_COLLECTION,
    id,
  });

  export const bigStore = (id: string): Selector => ({
    collection: BIG_STORE_COLLECTION,
    id,
  });

  export const userVerification = (id: string): Selector => ({
    collection: USER_VERIFICATION_COLLECTION,
    id,
  });
}

export default Selector;