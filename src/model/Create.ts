import Selector from './Selector';

namespace Create {
  export interface Request<T = any> {
    selector: Selector;
    value: T;
  }

  export interface Response {
  }
}

export default Create;


