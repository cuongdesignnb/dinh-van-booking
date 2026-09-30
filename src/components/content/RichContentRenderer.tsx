import type { ReactNode } from 'react';
import type { RichDocument, RichMark, RichNode } from '@/lib/content/rich-document';
import { mediaAlt } from '@/lib/media-alt';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  return /^(https?:|mailto:|tel:|\/|#)/i.test(href) ? href.slice(0, 2048) : null;
}

function alignClass(value: unknown): string | undefined {
  if (value === 'center' || value === 'right' || value === 'justify') return `rich-content__align--${value}`;
  return undefined;
}

function plainText(node: RichNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return text(node.text);
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map((child) => plainText(child)).join('');
}

function markText(value: ReactNode, marks: RichMark[] | undefined, key: string): ReactNode {
  return (marks ?? []).reduce<ReactNode>((current, mark, index) => {
    const attrs = record(mark.attrs);
    const markKey = `${key}-mark-${index}`;
    switch (mark.type) {
      case 'bold':
        return <strong key={markKey}>{current}</strong>;
      case 'italic':
        return <em key={markKey}>{current}</em>;
      case 'underline':
        return <u key={markKey}>{current}</u>;
      case 'strike':
        return <s key={markKey}>{current}</s>;
      case 'code':
        return <code key={markKey}>{current}</code>;
      case 'highlight':
        return <mark key={markKey}>{current}</mark>;
      case 'link': {
        const href = safeHref(attrs.href);
        if (!href) return current;
        const external = /^https?:/i.test(href);
        return (
          <a
            key={markKey}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
          >
            {current}
          </a>
        );
      }
      default:
        return current;
    }
  }, value);
}

function children(node: RichNode | undefined): ReactNode[] {
  return (node?.content ?? []).map((child, index) => renderNode(child, `${node?.type ?? 'node'}-${index}`));
}

function renderNode(node: RichNode, key: string): ReactNode {
  const attrs = record(node.attrs);
  const align = alignClass(attrs.textAlign);
  const className = align;

  switch (node.type) {
    case 'doc':
      return <div key={key}>{children(node)}</div>;
    case 'text':
      return <span key={key}>{markText(text(node.text), node.marks, key)}</span>;
    case 'hardBreak':
      return <br key={key} />;
    case 'paragraph':
      return <p key={key} className={className}>{children(node)}</p>;
    case 'heading': {
      const level = Math.min(Math.max(Number(attrs.level) || 2, 2), 4);
      if (level === 4) return <h4 key={key} className={className}>{children(node)}</h4>;
      if (level === 3) return <h3 key={key} className={className}>{children(node)}</h3>;
      return <h2 key={key} className={className}>{children(node)}</h2>;
    }
    case 'bulletList':
      return <ul key={key}>{children(node)}</ul>;
    case 'orderedList':
      return <ol key={key} start={typeof attrs.start === 'number' ? attrs.start : undefined}>{children(node)}</ol>;
    case 'listItem':
      return <li key={key}>{children(node)}</li>;
    case 'blockquote':
      return <blockquote key={key}>{children(node)}</blockquote>;
    case 'horizontalRule':
      return <hr key={key} />;
    case 'codeBlock': {
      const language = text(attrs.language);
      return (
        <pre key={key} data-language={language || undefined}>
          <code>{plainText(node)}</code>
        </pre>
      );
    }
    case 'image': {
      const src = safeHref(attrs.src);
      if (!src) return null;
      const width = typeof attrs.width === 'number' && attrs.width > 0 ? attrs.width : undefined;
      return (
        <figure key={key}>
          {/* Media URLs are whitelisted by the API; the renderer also refuses data/javascript URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={mediaAlt(attrs.alt, text(attrs.title) || 'Ảnh trong nội dung')} title={text(attrs.title) || undefined} width={width} loading="lazy" />
        </figure>
      );
    }
    case 'table':
      return <div key={key} className="rich-content__table-wrap"><table><tbody>{children(node)}</tbody></table></div>;
    case 'tableRow':
      return <tr key={key}>{children(node)}</tr>;
    case 'tableHeader':
      return <th key={key} colSpan={typeof attrs.colspan === 'number' ? attrs.colspan : undefined} rowSpan={typeof attrs.rowspan === 'number' ? attrs.rowspan : undefined}>{children(node)}</th>;
    case 'tableCell':
      return <td key={key} colSpan={typeof attrs.colspan === 'number' ? attrs.colspan : undefined} rowSpan={typeof attrs.rowspan === 'number' ? attrs.rowspan : undefined}>{children(node)}</td>;
    case 'callout': {
      const tone = ['info', 'success', 'warning', 'danger'].includes(text(attrs.tone)) ? text(attrs.tone) : 'info';
      return <aside key={key} className={`rich-content__callout rich-content__callout--${tone}`}>{children(node)}</aside>;
    }
    default:
      return <span key={key}>{children(node)}</span>;
  }
}

export function RichContentRenderer({ document, className = '' }: { document: RichDocument | null | undefined; className?: string }) {
  const root = document && typeof document === 'object' ? document : { type: 'doc', content: [] };
  return <div className={`rich-content${className ? ` ${className}` : ''}`}>{children(root)}</div>;
}
