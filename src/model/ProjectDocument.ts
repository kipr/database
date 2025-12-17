import Author from './Author';

export interface ProjectDocument {
  id: string;
  name: string;
  language: 'c' | 'cpp' | 'python' | 'graphical';
  author: Author;
  createdAt: string;
  updatedAt: string;
}

export default ProjectDocument;
