// src/app/db.ts
import Dexie, { type Table } from 'dexie';
import type { Case } from '@/types';

// Interface for an operation in the history (e.g., Move, Extrude)
export interface IOperation {
  id?: number;
  workspaceId: number;
  type: string; // 'TRANSFORM', 'EXTRUDE', 'BOOLEAN', etc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters: Record<string, any>; // { position: {x,y,z}, amount: 10 }
  timestamp: Date;
}

// Interface for the project's source file
export interface ISourceFile {
    id?: number;
    caseId?: string; // Links file to a specific patient case
    fileName: string;
    fileType: 'stl' | 'obj' | 'png' | 'jpg' | 'json';
    data: Blob; // The binary content of the file
}

// Interface for the active workspace (there will only be one)
export interface IWorkspace {
  id?: number; // Will always be 1 to resume the last job
  name: string;
  sourceFileId: number; // Foreign key to ISourceFile
  updatedAt: Date;
}

// Interface for custom templates created in Admin
export interface ITemplate {
  id: string; // UUID
  name: string;
  category: string;
  description: string;
  thumbnail?: string; // Base64 image of the 3D model
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any; // The JSON definition of the parametric model
  createdAt: Date;
}

export class MorfyDB extends Dexie {
  workspaces!: Table<IWorkspace>;
  sourceFiles!: Table<ISourceFile>;
  operations!: Table<IOperation>;
  cases!: Table<Case>;
  templates!: Table<ITemplate>;

  constructor() {
    super('morfyDB');
    this.version(1).stores({
      workspaces: '++id, updatedAt',
      sourceFiles: '++id, caseId',
      operations: '++id, workspaceId, timestamp',
      cases: 'id, status',
      templates: 'id, category'
    });
  }
}

export const db = new MorfyDB();
