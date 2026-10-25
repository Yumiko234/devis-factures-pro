import { useEffect, useRef } from "react";
import { Bold, Italic, Underline } from "lucide-react";
import { sanitizeRichText } from "@/lib/invoice";

export function RichTextInput({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);

  const cmd = (c: string) => {
    ref.current?.focus();
    document.execCommand(c);
    onChange(sanitizeRichText(ref.current?.innerHTML ?? ""));
  };

  const tools = [
    { c: "bold", icon: Bold, label: "Gras" },
    { c: "italic", icon: Italic, label: "Italique" },
    { c: "underline", icon: Underline, label: "Souligné" },
  ];

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex gap-1 border-b border-input p-1">
        {tools.map((t) => (
          <button key={t.c} type="button" aria-label={t.label} title={t.label} onMouseDown={(e) => { e.preventDefault(); cmd(t.c); }}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <t.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange(sanitizeRichText(e.currentTarget.innerHTML))}
        className="min-h-14 px-3 py-2 text-sm outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
