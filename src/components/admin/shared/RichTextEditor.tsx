'use client';

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Columns3,
  Eraser,
  Eye,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  PencilLine,
  Quote,
  Redo2,
  Rows3,
  Sparkles,
  Strikethrough,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useId, useRef, useState, type ComponentType, type SVGProps } from 'react';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import { AiContentAssistant, type AiEditorContext, type AiGeneratedFields } from './AiContentAssistant';

export type { RichDocument } from '@/lib/content/rich-document';

const EditorialImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-id'),
        renderHTML: (attributes) => attributes.mediaId ? { 'data-media-id': attributes.mediaId } : {},
      },
    };
  },
});

/** An empty TipTap document, used when a field has never been written. */
export const EMPTY_DOCUMENT: RichDocument = { type: 'doc', content: [{ type: 'paragraph' }] };

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

function ToolbarButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: IconType;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rte__btn${active ? ' is-active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}

function Toolbar({
  editor,
  onPickImage,
  previewMode,
  onTogglePreview,
  onAiWrite,
}: {
  editor: Editor;
  onPickImage?: () => void;
  previewMode: boolean;
  onTogglePreview: () => void;
  onAiWrite?: () => void;
}) {
  // Toolbar state has to re-render on every selection change, which TipTap
  // reports through the editor instance rather than through React state.
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    editor.on('transaction', rerender);
    editor.on('selectionUpdate', rerender);
    return () => {
      editor.off('transaction', rerender);
      editor.off('selectionUpdate', rerender);
    };
  }, [editor]);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [linkError, setLinkError] = useState('');
  const linkFieldId = useId();

  const openLinkForm = useCallback(() => {
    setLinkValue((editor.getAttributes('link').href as string | undefined) ?? 'https://');
    setLinkError('');
    setLinkOpen(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    const href = linkValue.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkOpen(false);
      return;
    }
    // The API drops anything executable; the editor refuses it up front so the
    // author finds out here rather than after saving.
    if (!/^(https?:|mailto:|tel:|\/|#)/i.test(href)) {
      setLinkError('Chỉ nhận http(s), mailto:, tel: hoặc đường dẫn nội bộ bắt đầu bằng /');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    setLinkOpen(false);
  }, [editor, linkValue]);

  return (
    <>
    <div className="rte__bar" role="toolbar" aria-label="Định dạng văn bản">
      {!previewMode ? <>
        <div className="rte__group">
          <ToolbarButton icon={Bold} label="In đậm" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
          <ToolbarButton icon={Italic} label="In nghiêng" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <ToolbarButton icon={UnderlineIcon} label="Gạch chân" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <ToolbarButton icon={Strikethrough} label="Gạch ngang" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
          <ToolbarButton icon={Eraser} label="Xoá định dạng" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} />
        </div>

        <div className="rte__group">
          <ToolbarButton icon={Heading2} label="Tiêu đề mục" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <ToolbarButton icon={Heading3} label="Tiêu đề phụ" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
          <ToolbarButton icon={Heading4} label="Tiêu đề nhỏ" active={editor.isActive('heading', { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} />
        </div>

        <div className="rte__group">
          <ToolbarButton icon={List} label="Danh sách" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <ToolbarButton icon={ListOrdered} label="Danh sách đánh số" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <ToolbarButton icon={Quote} label="Trích dẫn" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <ToolbarButton icon={Code2} label="Khối mã" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
          <ToolbarButton icon={Minus} label="Đường phân cách" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
        </div>

        <div className="rte__group">
          <ToolbarButton icon={AlignLeft} label="Căn trái" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
          <ToolbarButton icon={AlignCenter} label="Căn giữa" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
          <ToolbarButton icon={AlignRight} label="Căn phải" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
        </div>

        <div className="rte__group">
          {onAiWrite ? <ToolbarButton icon={Sparkles} label="AI viết nội dung và tạo ảnh" onClick={onAiWrite} /> : null}
          <ToolbarButton icon={Link2} label="Chèn liên kết" active={editor.isActive('link') || linkOpen} onClick={() => (linkOpen ? setLinkOpen(false) : openLinkForm())} />
          <ToolbarButton icon={Link2Off} label="Bỏ liên kết" disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()} />
          {onPickImage ? <ToolbarButton icon={ImagePlus} label="Chèn ảnh từ thư viện" onClick={onPickImage} /> : null}
          <ToolbarButton icon={Table2} label="Chèn bảng 3×3" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        </div>

        {editor.isActive('table') ? <div className="rte__group rte__table-tools" aria-label="Tác vụ bảng">
          <ToolbarButton icon={Rows3} label="Thêm hàng" onClick={() => editor.chain().focus().addRowAfter().run()} />
          <ToolbarButton icon={Columns3} label="Thêm cột" onClick={() => editor.chain().focus().addColumnAfter().run()} />
          <ToolbarButton icon={Trash2} label="Xoá bảng" onClick={() => editor.chain().focus().deleteTable().run()} />
        </div> : null}

        <div className="rte__group rte__group--end">
          <ToolbarButton icon={Undo2} label="Hoàn tác" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
          <ToolbarButton icon={Redo2} label="Làm lại" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
        </div>
      </> : null}
      <div className={`rte__group${previewMode ? ' rte__group--end' : ''}`}>
        <ToolbarButton icon={previewMode ? PencilLine : Eye} label={previewMode ? 'Quay lại soạn thảo' : 'Xem trước'} active={previewMode} onClick={onTogglePreview} />
      </div>
    </div>
    {!previewMode && linkOpen ? (
      <div className="rte__link">
        <label className="rte__link-label" htmlFor={linkFieldId}>
          Địa chỉ liên kết
        </label>
        <input
          id={linkFieldId}
          className="ainput rte__link-input"
          value={linkValue}
          autoFocus
          onChange={(event) => {
            setLinkValue(event.target.value);
            setLinkError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyLink();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setLinkOpen(false);
              editor.commands.focus();
            }
          }}
        />
        <button type="button" className="abtn abtn--primary abtn--sm" onClick={applyLink}>
          Áp dụng
        </button>
        <button
          type="button"
          className="abtn abtn--ghost abtn--sm"
          onClick={() => {
            setLinkOpen(false);
            editor.commands.focus();
          }}
        >
          Huỷ
        </button>
        {linkError ? (
          <p className="rte__link-error" role="alert">
            {linkError}
          </p>
        ) : null}
      </div>
    ) : null}
    </>
  );
}

/**
 * Rich text field built on TipTap (MIT). The value is a ProseMirror JSON
 * document, the same shape the API stores and sanitises. AI suggestions are
 * separately sanitised by the backend, then parsed into JSON only after the
 * administrator explicitly approves them.
 */
export function RichTextEditor({
  value,
  onChange,
  label,
  hint,
  placeholder = 'Nhập nội dung…',
  onPickImage,
  disabled,
  aiContext,
  onAiGenerated,
}: {
  value: RichDocument | null;
  onChange: (document: RichDocument, plainText: string) => void;
  label: string;
  hint?: string;
  placeholder?: string;
  onPickImage?: (insert: (attrs: { src: string; alt?: string; mediaId?: string }) => void) => void;
  disabled?: boolean;
  aiContext?: AiEditorContext;
  onAiGenerated?: (fields: AiGeneratedFields) => void;
}) {
  const id = useId();
  const onChangeRef = useRef(onChange);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<RichDocument>(value ?? EMPTY_DOCUMENT);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    // The admin renders on the client only; this keeps TipTap from warning
    // about a server/client mismatch.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: false,
      }),
      Link.configure({ openOnClick: false, autolink: false, protocols: ['http', 'https', 'mailto', 'tel'] }),
      EditorialImage.configure({ inline: false, allowBase64: false }),
      TableKit.configure({ table: { resizable: true } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? EMPTY_DOCUMENT,
    onUpdate: ({ editor: instance }) => {
      const next = instance.getJSON();
      setPreviewDocument(next);
      onChangeRef.current(next, instance.getText());
    },
  });

  // Reloading a different record has to replace the document without pushing
  // an extra entry onto the undo stack.
  useEffect(() => {
    if (!editor || !value) return;
    const current = JSON.stringify(editor.getJSON());
    if (current === JSON.stringify(value)) return;
    editor.commands.setContent(value, { emitUpdate: false });
    setPreviewDocument(value);
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const pickImage = onPickImage
    ? () =>
        onPickImage((attrs) => {
          editor?.chain().focus().setImage({ src: attrs.src, alt: attrs.alt ?? '' }).updateAttributes('image', { mediaId: attrs.mediaId ?? null }).run();
        })
    : undefined;

  if (!editor) {
    return (
      <div className="afield">
        <span className="afield__label">{label}</span>
        <div className="rte rte--loading" aria-busy="true" />
      </div>
    );
  }

  const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="afield">
      <label className="afield__label" htmlFor={id}>
        {label}
      </label>
      {hint ? <span className="afield__hint">{hint}</span> : null}
      <div className={`rte${disabled ? ' is-disabled' : ''}`}>
        <Toolbar editor={editor} onPickImage={pickImage} previewMode={previewMode} onTogglePreview={() => setPreviewMode((current) => !current)} onAiWrite={!disabled ? () => setAiOpen(true) : undefined} />
        {previewMode ? <RichContentRenderer document={previewDocument} className="rte__preview" /> : <EditorContent id={id} editor={editor} className="rte__body" />}
        <p className="rte__meta">{words} từ</p>
      </div>
      <AiContentAssistant
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        context={aiContext ?? { kind: 'article' }}
        onApply={(html, fields) => {
          editor.commands.setContent(html, { emitUpdate: true });
          setPreviewDocument(editor.getJSON());
          onAiGenerated?.(fields);
          setAiOpen(false);
        }}
      />
    </div>
  );
}
