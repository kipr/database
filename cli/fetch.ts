import axios from 'axios';
import * as fs from 'fs';

interface Args {
  url: string;
  asset: string;
  lease: string;
  iv: string;
}

export default async (args: Args) => {
  console.log('adasdasd');
  console.log(args);
  const res = await axios({
    method: 'get',
    url: `${args.url}/v1/big_store/${args.asset}`,
    params: {
      lease: args.lease,
      iv: args.iv,
    }
  });

  console.log(res.headers['Content-Type'], res.data);
};