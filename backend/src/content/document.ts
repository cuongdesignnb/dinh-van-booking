/**
 * Rich text is stored as a TipTap/ProseMirror JSON document, not as HTML, so
 * nothing the editor sends can become markup we did not intend. Everything that
 * arrives is rebuilt here against a whitelist: unknown node types, unknown
 * marks and unknown attributes are dropped rather than escaped.
 */
import { BadRequestException } from '@nestjs/common';

export interface RichNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

const ALLOWED_MARKS = new Set(['bold', 'italic', 'underline', 'strike', 'code', 'link', 'highlight']);

/** node type -> attributes it may keep */
const NODE_ATTRS: Record<string, string[]> = {
  doc: [],
  paragraph: ['textAlign'],
  text: [],
  hardBreak: [],
  heading: ['level', 'textAlign'],
  bulletList: [],
  orderedList: ['start'],
  listItem: [],
  blockquote: [],
  horizontalRule: [],
  codeBlock: ['language'],
  image: ['mediaId', 'src', 'alt', 'title', 'width'],
  table: [],
  tableRow: [],
  tableCell: ['colspan', 'rowspan', 'colwidth'],
  tableHeader: ['colspan', 'rowspan', 'colwidth'],
  callout: ['tone'],
};

/** Blocks the admin can switch off in settings, mapped to the node types they cover. */
const BLOCK_NODES: Record<string, string[]> = {
  paragraph: ['paragraph', 'text', 'hardBreak'],
  heading: ['heading'],
  bulletList: ['bulletList', 'listItem'],
  orderedList: ['orderedList', 'listItem'],
  blockquote: ['blockquote'],
  image: ['image'],
  table: ['table', 'tableRow', 'tableCell', 'tableHeader'],
  callout: ['callout'],
  codeBlock: ['codeBlock'],
  horizontalRule: ['horizontalRule'],
};

const MAX_DEPTH = 12;
const MAX_NODES = 5000;
const MAX_TEXT_LENGTH = 20000;

function allowedHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  // Anything that can execute (javascript:, data:, vbscript:) is dropped.
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(href)) return href.slice(0, 2048);
  return null;
}

export interface SanitizeOptions {
  allowedBlocks: string[];
}

export function sanitizeDocument(input: unknown, options: SanitizeOptions): RichNode {
  if (!input || typeof input !== 'object') {
    return { type: 'doc', content: [] };
  }
  const root = input as RichNode;
  if (root.type !== 'doc') throw new BadRequestException('Nội dung phải là một tài liệu hợp lệ');

  const allowedNodes = new Set<string>(['doc', 'paragraph', 'text', 'hardBreak']);
  for (const block of options.allowedBlocks) {
    for (const node of BLOCK_NODES[block] ?? []) allowedNodes.add(node);
  }

  let budget = MAX_NODES;

  const walk = (node: RichNode, depth: number): RichNode | null => {
    if (depth > MAX_DEPTH || budget-- <= 0) return null;
    if (typeof node?.type !== 'string' || !allowedNodes.has(node.type)) return null;

    const clean: RichNode = { type: node.type };

    if (node.type === 'text') {
      if (typeof node.text !== 'string') return null;
      clean.text = node.text.slice(0, MAX_TEXT_LENGTH);
      if (!clean.text) return null;
    }

    const allowedAttrs = NODE_ATTRS[node.type] ?? [];
    if (node.attrs && allowedAttrs.length) {
      const attrs: Record<string, unknown> = {};
      for (const key of allowedAttrs) {
        const value = node.attrs[key];
        if (value === undefined || value === null) continue;
        if (key === 'src') {
          const safe = allowedHref(value);
          if (safe) attrs[key] = safe;
          continue;
        }
        if (typeof value === 'string') attrs[key] = value.slice(0, 500);
        else if (typeof value === 'number' || typeof value === 'boolean') attrs[key] = value;
        else if (Array.isArray(value)) attrs[key] = value.filter((v) => typeof v === 'number').slice(0, 20);
      }
      if (node.type === 'heading') {
        const level = Number(attrs.level);
        attrs.level = Number.isFinite(level) ? Math.min(Math.max(Math.trunc(level), 2), 4) : 2;
      }
      if (Object.keys(attrs).length) clean.attrs = attrs;
    }

    if (Array.isArray(node.marks)) {
      const marks: NonNullable<RichNode['marks']> = [];
      for (const mark of node.marks) {
        if (!mark || !ALLOWED_MARKS.has(mark.type)) continue;
        if (mark.type !== 'link') {
          marks.push({ type: mark.type });
          continue;
        }
        const href = allowedHref(mark.attrs?.href);
        if (!href) continue;
        const external = href.startsWith('http');
        // Outbound links never hand the target our window reference.
        marks.push({
          type: 'link',
          attrs: external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href },
        });
      }
      if (marks.length) clean.marks = marks;
    }

    if (Array.isArray(node.content)) {
      const content = node.content
        .map((child) => walk(child, depth + 1))
        .filter((child): child is RichNode => child !== null);
      if (content.length) clean.content = content;
    }

    // An empty node with no text and no children carries nothing.
    if (node.type !== 'text' && node.type !== 'hardBreak' && node.type !== 'horizontalRule'
        && node.type !== 'image' && !clean.content) {
      return node.type === 'paragraph' ? { type: 'paragraph' } : null;
    }
    return clean;
  };

  const cleaned = walk(root, 0);
  return cleaned ?? { type: 'doc', content: [] };
}

/** Plain text of a document, for excerpts, search and read-time estimates. */
export function documentToText(node: unknown): string {
  const parts: string[] = [];
  const walk = (current: RichNode | undefined): void => {
    if (!current) return;
    if (current.type === 'text' && current.text) parts.push(current.text);
    if (current.type === 'hardBreak' || current.type === 'paragraph') parts.push(' ');
    current.content?.forEach(walk);
  };
  walk(node as RichNode);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

/** Media ids referenced inline, so deleting an image in use can be refused. */
export function documentMediaIds(node: unknown): string[] {
  const ids = new Set<string>();
  const walk = (current: RichNode | undefined): void => {
    if (!current) return;
    const mediaId = current.attrs?.mediaId;
    if (typeof mediaId === 'string') ids.add(mediaId);
    current.content?.forEach(walk);
  };
  walk(node as RichNode);
  return [...ids];
}
