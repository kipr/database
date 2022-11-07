# KIPR `database` service

The KIPR database service is a small frontend to Firestore. This is required because some adblockers block the Firestore API.

# API

## `GET /:collection`
Returns all records in the given collection that user has access to.

### Headers
`Authorization: Bearer <FIREBASE_TOKEN>`

## `GET /:collection/:id`
Returns the record with the given ID in the given collection that user has access to.

### Headers
`Authorization: Bearer <FIREBASE_TOKEN>`

## `POST /:collection/:id`
Creates or updates the record with the given ID in the given collection.

### Headers
`Authorization: Bearer <FIREBASE_TOKEN>`

### Body
A JSON-encoded value of the record to write. The JSON object must contain an `author` key conforming the the `Author` schema.

## `DELETE /:collection/:id`
Deletes the record with the given ID in the given collection.

### Headers
`Authorization: Bearer <FIREBASE_TOKEN>`

# Running

## Dependencies
 - [Redis](https://redis.io/)

## Setup

```sh
yarn install
yarn build
```

## Execution

Redis server must be running.

```sh
FIREBASE_SERVICE_ACCOUNT_KEY_FILE=service_account_key.json FIREBASE_DATABASE_URL=https://kipr-321905-default-rtdb.firebaseio.com yarn start
```

where `service_account_key.json` is a service account key file for the Firestore Admin SDK.

## Environment Variables
  - `PORT` (default: `4000`) - Port to listen on
  - `FIREBASE_SERVICE_ACCOUNT_KEY_FILE` - Firebase service account key JSON (as a file path)
  - `FIREBASE_SERVICE_ACCOUNT_KEY_STRING` - Firebase service account key JSON (as a string)
  - `FIREBASE_DATABASE_URL` - Firebase database URL
  - `REDIS_HOST` (default: `localhost`) - Redis host
  - `REDIS_PORT` (default: `6379`) - Redis port
  - `REDIS_PASSWORD` - Redis password