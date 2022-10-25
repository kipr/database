import fastify, { FastifyRequest } from 'fastify';
import { DecodedIdToken } from 'firebase-admin/auth';
import auth from './auth';
import config from './config';
import firestore from './firestore';
import collections from './collections';

import Get from 'database-model/Get';
import Author from 'database-model/Author';
import Error from 'database-model/Error';
import Db from './db';
import RedisCache from './RedisCache';

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

const cache = new RedisCache({

});
const db = new Db(cache);

app.get('/:collection/:id', async (request, reply) => {
  const token = await authenticate(request);

  const { collection, id } = request.params as { collection: string; id: string; };

  const res = await db.get({ selector: { collection, id } });

  if (res.type === 'error') {
    reply.code(res.code).send({ message: res.message });
    return;
  }

  reply.code(200).send(res.value);
});

app.get('/:collection/:id', async (request, reply) => {

const main = async () => {
  await app.listen({
    port: +config.port,
  });
};

main();