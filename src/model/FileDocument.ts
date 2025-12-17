import Author from './Author';

export interface FileDocument {
  id: string;
  name: string;
  content: string;
  author: Author;
  createdAt: string;
  updatedAt: string;
}

export default FileDocument;
