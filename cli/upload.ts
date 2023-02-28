import axios from 'axios';
import * as fs from 'fs';

interface Args {
  url: string;
  upload_file: string;
}

const EXTENSION_CONTENT_TYPES = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'mp4': 'video/mp4',
  'mov': 'video/quicktime',
  'm4v': 'video/x-m4v',
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'pdf': 'application/pdf',
  'txt': 'text/plain',
  'html': 'text/html',
  'md': 'text/markdown',
  'markdown': 'text/markdown',
};

export default async (args: Args) => {
  // POST /v1/big_store and stream the file

  const readStream = fs.createReadStream(args.upload_file);
  readStream.on('error', (err) => {
    throw err;
  });
  const {size} = fs.statSync(args.upload_file);
  
  const extensionIndex = args.upload_file.indexOf('.');
  const extension = args.upload_file.slice(extensionIndex + 1);

  const contentType = EXTENSION_CONTENT_TYPES[extension];
  if (!contentType) {
    throw new Error(`Unknown file extension: ${extension}`);
  }

  const res = await axios({
    method: 'post',
    url: `${args.url}/v1/big_store`,
    data: readStream,
    headers: {
      'Content-Type': contentType,
      'Content-Length': size,
    },
  });

  console.log(res.data);
};