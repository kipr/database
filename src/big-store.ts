import * as GoogleCloudStorage from '@google-cloud/storage';
import { FastifyInstance } from 'fastify';

import config from './config';

import * as crypto from 'crypto';
import Db from './db';
import Selector from './model/Selector';
import { base64UrlDecode, base64UrlEncode } from './util';

export default (app: FastifyInstance, db: Db) => {
  app.addContentTypeParser('*', function (req, payload, done) {
    done(undefined)
  })

  app.post('/v1/big_store', (request, reply) => {
    const storage = new GoogleCloudStorage.Storage({
      projectId: config.googleStorage.projectId,
      credentials: config.googleStorage.serviceAccountKey,
    });

    const bucket = storage.bucket(config.googleStorage.bucketName);

    // Generate random file name
    const fileName = crypto.randomBytes(8).toString('hex');

    // Create sha-512 hasher
    const hasher = crypto.createHash('sha512');

    const uploadFile = bucket.file(fileName);

    const writeStream = uploadFile.createWriteStream({
      chunkSize: 1024 * 1024,
      contentType: request.headers['content-type'],
    });

    const contentType = request.headers['content-type'];
    console.log ('content-type', contentType);

    writeStream.on('error', (err) => {
      console.error(err);
      reply.code(500).send({
        error: err,
      });
    });

    writeStream.on('finish', async () => {
      // Finalize the hash
      const hash = base64UrlEncode(hasher.digest('base64'));

      try {
        // Rename the file to the hash
        await uploadFile.move(hash);
      } catch (err) {

        // delete the file
        uploadFile.delete();

        console.error(err);
        reply.code(500).send({
          error: err,
        });
        return;
      }

      const cloudStorageUri = bucket.file(hash).cloudStorageURI;
      reply.code(200).send({
        cloudStorageUri,
      });
    });

    const buffers: Buffer[] = [];
    let buffersSize = 0;

    let shouldWrite = true;
    let finished = false;
    writeStream.on('drain', () => {
      shouldWrite = true;

      if (!finished || buffers.length === 0) return;

      const buffer = Buffer.concat(buffers, buffersSize);
      buffersSize = 0;
      buffers.length = 0;
      writeStream.write(buffer);
      writeStream.end();
      return;
    });

    request.raw.on('data', (data: Buffer) => {
      buffersSize += data.byteLength;
      buffers.push(data);
      hasher.update(data);

      if (buffersSize < 1024 * 1024) return;
      
      const buffer = Buffer.concat(buffers, buffersSize);
      buffersSize = 0;
      buffers.length = 0;

      if (shouldWrite) shouldWrite = writeStream.write(buffer);
      else buffers.push(buffer);
    });

    request.raw.on('end', () => {
      if (buffersSize === 0) return;

      const buffer = Buffer.concat(buffers, buffersSize);
      buffersSize = 0;
      buffers.length = 0;

      if (shouldWrite) {
        shouldWrite = writeStream.write(buffer);
        writeStream.end();
      } else buffers.push(buffer);
      
      finished = true;
    });

    request.raw.on('error', (err) => {
      console.error(err);
      
      // clean up file
      uploadFile.delete();
      
      reply.code(500).send({
        error: err,
      });
    });
  });

  app.post('/v1/big_store/lease', async (request, reply) => {
    const assetsObj = request.body as any;

    if (typeof assetsObj !== 'object' || !('assets' in assetsObj)) return reply.code(400).send({
      error: 'Invalid body (assetsObj)',
    });

    const { assets } = assetsObj;

    if (!Array.isArray(assets)) return reply.code(400).send({
      error: 'Invalid body (assets)',
    });

    const storage = new GoogleCloudStorage.Storage({
      projectId: config.googleStorage.projectId,
      credentials: config.googleStorage.serviceAccountKey,
    });

    const bucket = storage.bucket(config.googleStorage.bucketName);

    // Make sure all the assets exist
    const assetPromises = assets.map(async (asset) => {
      const assetRef = bucket.file(asset);
      const [exists] = await assetRef.exists();
      return exists;
    });

    const assetExists = await Promise.all(assetPromises);

    if (assetExists.some((exists) => !exists)) return reply.code(400).send({
      error: 'Invalid assets',
    });

    const iv = crypto.randomBytes(12);
    console.log(config.lease.key);
    const cipher = crypto.createCipheriv('aes-256-gcm', config.lease.key, iv);

    const lease = {
      // 30 days
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      assets,
    };

    const leaseString = JSON.stringify(lease);

    const encryptedLease = Buffer.concat([
      cipher.update(leaseString),
      cipher.final(),
    ]);

    cipher.destroy();

    // Return the lease and iv
    reply.code(200).send({
      lease: base64UrlEncode(encryptedLease.toString('base64')),
      iv: base64UrlEncode(iv.toString('base64')),
    });
  });

  app.get('/v1/big_store/:hash', async (request, reply) => {
    const { hash } = request.params as { hash: string; };
    
    const { query } = request;

    if (typeof query !== 'object') return reply.code(400).send({
      error: 'Invalid query',
    });

    if (!('lease' in query) || typeof query['lease'] !== 'string') return reply.code(400).send({
      error: 'Lease not found',
    });

    const lease = query['lease'];

    if (!('iv' in query) || typeof query['iv'] !== 'string') return reply.code(400).send({
      error: 'IV not found',
    });

    const iv = query['iv'];

    const decipher = crypto.createDecipheriv('aes-256-gcm', config.lease.key, Buffer.from(base64UrlDecode(iv), 'base64'));

    let leaseObj: any;
    try {
      leaseObj = JSON.parse(Buffer.concat([
        decipher.update(Buffer.from(base64UrlDecode(lease), 'base64')),
        decipher.final(),
      ]).toString());
    } catch (err) {
      console.error(err);
      return reply.code(400).send({
        error: 'Invalid lease',
      });
    }

    decipher.destroy();

    if (typeof leaseObj !== 'object' || !('expires_at' in leaseObj) || !('assets' in leaseObj)) return reply.code(400).send({
      error: 'Invalid lease',
    });

    const { expires_at, assets } = leaseObj;

    if (typeof expires_at !== 'string' || !Array.isArray(assets)) return reply.code(400).send({
      error: 'Invalid lease',
    });

    const expiresAt = new Date(expires_at);

    if (isNaN(expiresAt.getTime())) return reply.code(400).send({
      error: 'Invalid lease',
    });

    if (expiresAt.getTime() < Date.now()) return reply.code(400).send({
      error: 'Lease expired',
    });

    if (!assets.includes(hash)) return reply.code(400).send({
      error: 'Invalid asset',
    });

    const storage = new GoogleCloudStorage.Storage({
      projectId: config.googleStorage.projectId,
      credentials: config.googleStorage.serviceAccountKey,
    });

    const bucket = storage.bucket(config.googleStorage.bucketName);

    const file = bucket.file(hash);

    const [exists] = await file.exists();

    if (!exists) return reply.code(404).send({
      error: 'Not found',
    });

    const [metadata] = await file.getMetadata();

    reply.header('content-type', metadata.contentType);

    reply.code(200).send(file.createReadStream());
  });
};