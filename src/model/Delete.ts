import Selector from './Selector';
import Error from './Error';

namespace Delete {
  export interface Request<T = any> {
    selector: Selector;
    userId?: string;
  }

  export namespace Response {
    export interface Success {
      type: 'success';
    }
  }

  export type Response = Response.Success | Error;
}

export default Delete;


