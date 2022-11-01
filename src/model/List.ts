import Selector from './Selector';
import Error from './Error';
import Author from './Author';
import Brief from './Brief';

namespace List {
  export interface Request<T = any> {
    author: Author;
    collection: string;
  }

  export namespace Response {
    export interface Success<T = any> {
      type: 'success';
      values: { [id: string]: T };
    }
  }

  export type Response<T = any> = Response.Success<T> | Error;
}

export default List;


