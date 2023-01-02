import Selector from './Selector';

namespace Create {
  export interface Request<T = any> {
    selector: Selector;
    userId?: string;
    value: T;
  }

  export interface Response {
  }
}

export default Create;


