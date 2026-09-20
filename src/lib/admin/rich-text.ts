/**
 * Helpers for moving between plain text and the TipTap/ProseMirror document
 * the editor and the API both use. The API sanitises whatever it receives, so
 * these are about shape, not safety.
 */
export interface RichTextNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

/** Turns legacy plain text into a document, one paragraph per blank-line block. */
export function plainTextToDocument(text: string): RichTextNode {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) return { type: 'doc', content: [{ type: 'paragraph' }] };

  return {
    type: 'doc',
    content: blocks.map((block) => ({
      type: 'paragraph',
      content: block.split('\n').flatMap((line, index) =>
        index === 0
          ? [{ type: 'text', text: line }]
          : [{ type: 'hardBreak' }, { type: 'text', text: line }],
      ),
    })),
  };
}

/** Plain-text projection, used for excerpts, list previews and search. */
export function documentToPlainText(document: unknown): string {
  const lines: string[] = [];

  const walk = (node: RichTextNode | undefined, buffer: string[]): void => {
    if (!node) return;
    if (node.type === 'text' && node.text) {
      buffer.push(node.text);
      return;
    }
    if (node.type === 'hardBreak') {
      buffer.push('\n');
      return;
    }

    const isBlock = node.type !== 'doc' && !node.marks && node.type !== 'text';
    const target = isBlock ? [] : buffer;
    node.content?.forEach((child) => walk(child, target as string[]));

    if (isBlock && target !== buffer) {
      const line = (target as string[]).join('').trim();
      if (line) lines.push(line);
    }
  };

  walk(document as RichTextNode, []);
  return lines.join('\n\n');
}

/** True when a document has no text and no images — used to require content. */
export function isEmptyDocument(document: unknown): boolean {
  return documentToPlainText(document).trim().length === 0;
}
