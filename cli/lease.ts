import axios from 'axios';
import * as fs from 'fs';

interface Args {
  url: string;
  assets: string[];
}

export default async (args: Args) => {
  // POST /v1/big_store and stream the file
  
  const res = await axios({
    method: 'post',
    url: `${args.url}/v1/big_store/lease`,
    data: JSON.stringify({
      assets: args.assets
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  


  console.log(res.data);
};