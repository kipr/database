import { ArgumentParser } from 'argparse';
import lease from './lease';
import upload from './upload';
import fetch from './fetch';

const parser = new ArgumentParser({
  description: 'Database CLI',
  add_help: true,
});

parser.add_argument('-u', '--url', {
  type: String,
  required: true,
  help: 'Database URL',
});


const subparsers = parser.add_subparsers();

const uploadParser = subparsers.add_parser('upload');

uploadParser.add_argument('upload_file', {
  type: String,
});

const leaseParser = subparsers.add_parser('lease');

// Array of strings
leaseParser.add_argument('assets', {
  type: String,
  nargs: '+',
});

const fetchParser = subparsers.add_parser('fetch');

fetchParser.add_argument('asset', {
  type: String,
});

fetchParser.add_argument('lease', {
  type: String,
});

fetchParser.add_argument('iv', {
  type: String,
});

// Parse

const args = parser.parse_args();

if (args.upload_file) upload(args);
else if (args.assets) lease(args);
else if (args.asset) fetch(args);