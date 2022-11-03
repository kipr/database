import Author from './model/Author';
import Selector from './model/Selector';

interface Cache {
  get(selector: Selector): Promise<object | null>;
  set(selector: Selector, value: object | null): Promise<void>;
  remove(selector: Selector): Promise<void>;
}

export default Cache;