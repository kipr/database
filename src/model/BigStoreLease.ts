import Author from './Author';

interface BigStoreLease {
  borrower: Author;
  expires_at: string;
  assets: string[];
}

export default BigStoreLease;