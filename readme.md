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

Redis server must be running. (Check with redis-cli)

```sh
FIREBASE_SERVICE_ACCOUNT_KEY_FILE=service_account_key.json GOOGLE_STORAGE_SERVICE_ACCOUNT_KEY_FILE=service_account_key.json GOOGLE_STORAGE_BUCKET_NAME=kipr-big-store GOOGLE_STORAGE_PROJECT_ID=kipr-321905 FIREBASE_DATABASE_URL=https://kipr-321905-default-rtdb.firebaseio.com yarn start
```

where `service_account_key.json` is a service account key file for the Firestore Admin SDK and Google Storage.

## Environment Variables
  - `HOST` (default: `127.0.0.1`) - Host to bind to
  - `PORT` (default: `4000`) - Port to listen on
  - `FIREBASE_SERVICE_ACCOUNT_KEY_FILE` - Firebase service account key JSON (as a file path). Only used if `FIREBASE_SERVICE_ACCOUNT_KEY_STRING` is not present
  - `FIREBASE_SERVICE_ACCOUNT_KEY_STRING` - Firebase service account key JSON (as a string)
  - `GOOGLE_STORAGE_SERVICE_ACCOUNT_KEY_FILE` - Google Storage service account key JSON (as a file path). Only used if `GOOGLE_STORAGE_SERVICE_ACCOUNT_KEY_STRING` is not present. Can be the same value as `FIREBASE_SERVICE_ACCOUNT_KEY_FILE`
  - `GOOGLE_STORAGE_SERVICE_ACCOUNT_KEY_STRING` - Google Storage service account key JSON (as a string). Can be the same value as `FIREBASE_SERVICE_ACCOUNT_KEY_STRING`
  - `GOOGLE_STORAGE_BUCKET_NAME` - Name of the Google Storage bucket in which to store big data
  - `GOOGLE_STORAGE_PROJECT_ID` - Name of the Google Storage project in which to store big data
  - `FIREBASE_DATABASE_URL` - Firebase database URL
  - `REDIS_HOST` (default: `localhost`) - Redis host
  - `REDIS_PORT` (default: `6379`) - Redis port
  - `REDIS_PASSWORD` - Redis password
