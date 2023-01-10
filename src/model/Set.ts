import Selector from './Selector';
import Error from './Error';

namespace Set {
  export interface Request<T = any> {
    selector: Selector;
    userId?: string;
    value: T;
  }

  export namespace Response {
    export interface Success {
      type: 'success';
    }
  }

  export type Response = Response.Success | Error;
}

export default Set;


