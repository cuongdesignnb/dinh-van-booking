export type RichMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type RichNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  marks?: RichMark[];
  text?: string;
};

/** The TipTap/ProseMirror JSON shape used by the CMS. */
export type RichDocument = RichNode;

export const EMPTY_DOCUMENT: RichDocument = { type: 'doc', content: [{ type: 'paragraph' }] };
