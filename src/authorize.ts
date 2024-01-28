import Author from './model/Author';
import Selector from './model/Selector';
import { DecodedIdToken } from 'firebase-admin/auth';
import Db from './db';
import { USER_COLLECTION } from './model/constants';

export namespace AuthorizeResult {
  export enum Type {
    NotAuthorized = 'not-authorized',
    Authorized = 'authorized'
  }

  export interface NotAuthorized {
    type: Type.NotAuthorized;
    exists: boolean;
  }

  export const notAuthorized = (exists: boolean): NotAuthorized => ({ type: Type.NotAuthorized, exists });

  export interface Authorized {
    type: Type.Authorized;
    value: object;
    read: boolean;
    write: boolean;
  }

  export const authorized = (params: Omit<Authorized, 'type'>): Authorized => ({ type: Type.Authorized, ...params });
}

export type AuthorizeResult = AuthorizeResult.NotAuthorized | AuthorizeResult.Authorized;

export default async (recordSelector: Selector, token: DecodedIdToken, db: Db): Promise<AuthorizeResult> => {
  const userId = token.sub;

  const res = await db.get({ selector: recordSelector, userId });
  if (res.type === 'error') {
    console.error(res);
    return AuthorizeResult.notAuthorized(false);
  }
  const { value } = res;
  if (!value || typeof value !== 'object') return AuthorizeResult.notAuthorized(false);

  // User collection can only be accessed by the correct user
  // or the simulator backend (for APIs like parental consent)
  if (recordSelector.collection === USER_COLLECTION) {
    const isPrivilegedUser = userId === 'simulator' && token['sim_backend'] === true;
    const isSelf = userId === recordSelector.id;
    return isPrivilegedUser || isSelf
      ? AuthorizeResult.authorized({ value, read: true, write: true })
      : AuthorizeResult.notAuthorized(true);
  }

  if (!('author' in value)) return AuthorizeResult.authorized({ value, read: true, write: false });

  const author = value['author'] as Author;
  // Organizations aren't yet supported.
  if (author.type === Author.Type.Organization) return AuthorizeResult.notAuthorized(true);
  
  return author.id === userId
    ? AuthorizeResult.authorized({ value, read: true, write: true })
    : AuthorizeResult.notAuthorized(true);
};