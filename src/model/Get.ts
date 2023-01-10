import Selector from './Selector';
import Error from './Error';

namespace Get {
  export interface Request {
    selector: Selector;
    userId?: string;
  }

  export namespace Response {
    export interface Success<T = any> {
      type: 'success';
      value: T;
    }
  }

  export type Response<T = any> = Response.Success<T> | Error;
}

export default Get;


