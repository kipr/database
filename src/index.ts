import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { DecodedIdToken } from 'firebase-admin/auth';
import auth from './auth';
import config from './config';

import Author from 'database-model/Author';
import Error from 'database-model/Error';
import Db from './db';
import RedisCache from './RedisCache';
import Selector from 'database-model/Selector';
import authorize, { AuthorizeResult } from './authorize';

const UNAUTHORIZED_RESULT = { message: 'Unauthorized' };

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

const cache = new RedisCache({
  host: config.redis.host,
  port: +config.redis.port,
  password: config.redis.password,
});

const db = new Db(cache);

app.get('/:collection/:id', async (request, reply) => {
  const token = await authenticate(request);

  if (!token) return unauthorized(reply);

  const { collection, id } = request.params as { collection: string; id: string; };

  const selector: Selector = { collection, id };

  const authRes = await authorize(selector, token.sub, db);
  if (authRes.type === AuthorizeResult.Type.NotAuthorized) return unauthorized(reply);

  reply.code(200).send(authRes.value);
});

app.get('/:collection', async (request, reply) => {
  const token = await authenticate(request);

  if (!token) return unauthorized(reply);

  const { collection } = request.params as { collection: string; };

  const res = await db.list({ author: Author.user(token.sub), collection });

  if (res.type === 'error') {
    reply.code(res.code).send({ message: res.message });
    return;
  }

  reply.code(200).send(res.values);
});

app.post('/:collection/:id', async (request, reply) => {
  const token = await authenticate(request);

  if (!token) return unauthorized(reply);

  const { collection, id } = request.params as { collection: string; id: string; };
  
  const selector: Selector = { collection, id };

  const authRes = await authorize(selector, token.sub, db);
  if (authRes.type === AuthorizeResult.Type.NotAuthorized) return unauthorized(reply);
  
  const value = request.body as object;

  const res = await db.set({ selector: { collection, id }, value });

  if (res.type === 'error') {
    reply.code(res.code).send({ message: res.message });
    return;
  }

  reply.code(204).send();
});

app.delete('/:collection/:id', async (request, reply) => {
  const token = await authenticate(request);
  if (!token) return unauthorized(reply);

  const { collection, id } = request.params as { collection: string; id: string; };

  const selector: Selector = { collection, id };

  const authRes = await authorize(selector, token.sub, db);
  if (authRes.type === AuthorizeResult.Type.NotAuthorized) return unauthorized(reply);

  const res = await db.delete({ selector });

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

const main = async () => {
  await app.listen({
    port: +config.port,
  });
};

main();