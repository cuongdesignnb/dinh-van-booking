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

/** Plain-text projection for metadata and brand copy stored as RichText. */
export function richDocumentToText(value: unknown): string {
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
  const parts: string[] = [];
  const walk = (node: RichNode | undefined): void => {
    if (!node) return;
    if (node.type === 'text' && node.text) parts.push(node.text);
    if (node.type === 'paragraph' || node.type === 'hardBreak') parts.push(' ');
    node.content?.forEach(walk);
  };
  walk(value as RichNode);
  return parts.join('').replace(/\s+/g, ' ').trim();
}
