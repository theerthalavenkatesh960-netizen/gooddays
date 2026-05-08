import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Code, Link as LinkIcon, Undo, Redo } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = 'Write your thoughts...' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ paragraph: { HTMLAttributes: { class: 'mb-2' } } }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded-lg transition-colors ${isActive ? 'bg-accent text-white' : 'bg-surface-elevated text-text-muted hover:bg-surface'}`;

  return (
    <div className="border border-border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-3" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass(editor.isActive('bold'))}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass(editor.isActive('italic'))}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <div className="w-px" style={{ backgroundColor: 'var(--border)' }} />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 1 }))}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 2 }))}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </button>
        <div className="w-px" style={{ backgroundColor: 'var(--border)' }} />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass(editor.isActive('bulletList'))}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonClass(editor.isActive('orderedList'))}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
        <div className="w-px" style={{ backgroundColor: 'var(--border)' }} />
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={buttonClass(editor.isActive('blockquote'))}
          title="Quote"
        >
          <Quote size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={buttonClass(editor.isActive('codeBlock'))}
          title="Code Block"
        >
          <Code size={16} />
        </button>
        <div className="w-px" style={{ backgroundColor: 'var(--border)' }} />
        <button
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }}
          className={buttonClass(editor.isActive('link'))}
          title="Insert Link"
        >
          <LinkIcon size={16} />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${editor.can().undo() ? 'bg-surface-elevated text-text-muted hover:bg-surface' : 'bg-surface-elevated text-text-muted'}`}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${editor.can().redo() ? 'bg-surface-elevated text-text-muted hover:bg-surface' : 'bg-surface-elevated text-text-muted'}`}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={16} />
        </button>
      </div>

      {/* Editor */}
      <div className="prose-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
        <EditorContent
          editor={editor}
          className="min-h-[48vh] sm:min-h-[56vh] p-4 outline-none"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* TipTap styles override */}
      <style>{`
        .ProseMirror {
          outline: none;
          color: var(--text-primary) !important;
        }
        .ProseMirror h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
        .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
        .ProseMirror h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
        .ProseMirror p { line-height: 1.6; }
        .ProseMirror ul { list-style: disc; margin-left: 1.5em; }
        .ProseMirror ol { list-style: decimal; margin-left: 1.5em; }
        .ProseMirror blockquote { border-left: 4px solid var(--accent); padding-left: 1em; margin: 0.5em 0; opacity: 0.7; }
        .ProseMirror pre { background: var(--surface); padding: 0.5em; border-radius: 0.5em; overflow-x: auto; }
        .ProseMirror code { background: var(--surface); padding: 0.2em 0.4em; border-radius: 0.3em; font-family: monospace; }
        .ProseMirror a { color: var(--accent); text-decoration: underline; cursor: pointer; }
      `}</style>
    </div>
  );
}
