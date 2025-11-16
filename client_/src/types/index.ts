import type * as monaco from 'monaco-editor';

export interface Editor {
  id: number;
  name: string;
  language: string;
  content?: string;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
  socketId: string;
  editorId: number;
}

export interface CodeUpdate {
  code: string;
  editorId: number;
}

export interface RemoteCursor {
  widget: monaco.editor.IContentWidget;
  position: { lineNumber: number; column: number };
  color: string;
}
