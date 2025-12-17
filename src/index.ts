import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { DecodedIdToken } from 'firebase-admin/auth';
import auth from './auth';
import config from './config';

import Author from './model/Author';
import Error from './model/Error';
import Db from './db';
import RedisCache from './RedisCache';
import Selector from './model/Selector';
import authorize, { AuthorizeResult } from './authorize';
import { CHALLENGE_COMPLETION_COLLECTION, USER_COLLECTION } from './model/constants';

import bigStore from './big-store';
import { parseCollectionSegment } from './collectionParser';

const UNAUTHORIZED_RESULT = { message: 'Unauthorized' };
const NOT_FOUND_RESULT = { message: 'Not Found' };

const app = fastify({
  logger: true
});

const authenticateHeader = async (authorization?: string): Promise<DecodedIdToken | null> => {
  if (!authorization) return null;
  const [type, token] = authorization.split(' ');
  if (type !== 'Bearer') return null;
  const decoded = await auth.verifyIdToken(token);
  return decoded;
};

const authenticate = async (request: FastifyRequest): Promise<DecodedIdToken | null> =>
  authenticateHeader(request.headers.authorization);

const unauthorized = (reply: FastifyReply) => reply.code(Error.CODE_NOT_AUTHORIZED).send(UNAUTHORIZED_RESULT);
const notFound = (reply: FastifyReply) => reply.code(Error.CODE_NOT_FOUND).send(NOT_FOUND_RESULT);

const cache = new RedisCache({
  host: config.redis.host,
  port: +config.redis.port,
  password: config.redis.password,
});

const db = new Db(cache);

// silly liveness probe
app.get('/', async (request, reply) => {
  reply.send({ database: 'alive' });
});

// Helper to extract collection + params from a route param
const parseCollectionFromParams = (collectionSegment: string, reply: FastifyReply) => {
  const parsed = parseCollectionSegment(collectionSegment);
  if (!parsed) {
    reply.code(400).send({ message: 'Malformed collection segment' });
    return null;
  }
  
  return parsed;
};

app.get('/:collectionSegment/:id', async (request, reply) => {
  const token = await authenticate(request);

  if (!token) return unauthorized(reply);

  const { collectionSegment, id } = request.params as { collectionSegment: string; id: string; };
  const parsed = parseCollectionFromParams(collectionSegment, reply);
  if (!parsed) return; // response already sent
  const { collection, params: collectionParams } = parsed;

  const selector: Selector = { collection, id, subCollectionIds: collectionParams };

  // Expose parsed collection params via reply header for now (could also attach to request)
  // (request as any).collectionParams = collectionParams;

  const authRes = await authorize(selector, token, db);
  if (authRes.type === AuthorizeResult.Type.NotAuthorized) {
    if (authRes.exists) return unauthorized(reply);
    else return notFound(reply);
  }

  if (!authRes.read) return unauthorized(reply);

  reply.code(200).send(authRes.value);
});

app.get('/:collectionSegment', async (request, reply) => {
  const token = await authenticate(request);

  if (!token) return unauthorized(reply);
  const { collectionSegment } = request.params as { collectionSegment: string; };
  const parsed = parseCollectionFromParams(collectionSegment, reply);
  if (!parsed) return;
  const { collection, params: collectionParams } = parsed;

  const res = await db.list({
    author: Author.user(token.sub),
    collection,
    subCollectionIds: collectionParams,
    userId: token.sub
  });

  if (res.type === 'error') {
    reply.code(res.code).send({ message: res.message });
    return;
  }

  reply.code(200).send(res.values);
});

const createPostPatchHandler = (isPatch: boolean) => async (request: FastifyRequest, reply: FastifyReply) => {
  const token = await authenticate(request);

  if (!token) return unauthorized(reply);

  const { collectionSegment, id } = request.params as { collectionSegment: string; id: string; };
  const parsed = parseCollectionFromParams(collectionSegment, reply);
  if (!parsed) return;
  const { collection, params: collectionParams } = parsed;
  // (request as any).collectionParams = collectionParams;

  const selector: Selector = { collection, id, subCollectionIds: collectionParams };

  const value = request.body as object;

  if (collection !== CHALLENGE_COMPLETION_COLLECTION) {
    const authRes = await authorize(selector, token, db);
    if (authRes.type === AuthorizeResult.Type.NotAuthorized) {
      if (authRes.exists) {
        console.error('Exists but not authorized');
        return unauthorized(reply);
      }

      if (collection !== USER_COLLECTION) {
        if (!('author' in value)) return unauthorized(reply);
        const author = value['author'];
        if (typeof author !== 'object' || !('type' in author)) return unauthorized(reply);
        if (author.type !== Author.Type.User) return unauthorized(reply);
        if (!('id' in author)) return unauthorized(reply);
        if (author.id !== token.sub) return unauthorized(reply);
      }
    } else if (!authRes.write) {
      console.error('User tried to write to a collection they do not have write access to');
      return unauthorized(reply);
    }
  }

  const res = await db.set({ selector, value, userId: token.sub, partialUpdate: isPatch });

  if (res.type === 'error') {
    reply.code(res.code).send({ message: res.message });
    return;
  }

  reply.code(204).send();
};

app.post('/:collectionSegment/:id', createPostPatchHandler(false));

app.patch('/:collectionSegment/:id', createPostPatchHandler(true));

app.delete('/:collectionSegment/:id', async (request, reply) => {
  const token = await authenticate(request);
  if (!token) return unauthorized(reply);
  const { collectionSegment, id } = request.params as { collectionSegment: string; id: string; };
  const parsed = parseCollectionFromParams(collectionSegment, reply);
  if (!parsed) return;
  const { collection, params: collectionParams } = parsed;
  // (request as any).collectionParams = collectionParams;

  const selector: Selector = { collection, id, subCollectionIds: collectionParams };

  const authRes = await authorize(selector, token, db);
  if (authRes.type === AuthorizeResult.Type.NotAuthorized) return unauthorized(reply);
  if (!authRes.write) return unauthorized(reply);

  const res = await db.delete({ selector, userId: token.sub });

  if (res.type === 'error') {
    reply
      .code(res.code)
      .send({ message: res.message });
    return;
  }

  reply
    .code(204)
    .send();
});

if (config.googleStorage.serviceAccountKey && config.googleStorage.projectId && config.googleStorage.bucketName) {
  bigStore(app, db);
} else {
  console.log('Config not set for Google Storage, so big store APIs will not be available');
}


const main = async () => {
  await app.listen({
    host: config.host,
    port: +config.port,
  });
};

main();