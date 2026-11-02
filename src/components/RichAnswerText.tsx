import React from 'react';

/**
 * Minimal, SAFE markdown renderer for assistant answers (no HTML injection):
 * paragraphs, "- " / "* " / "• " bullets, "1. " numbered steps, "## " headings and **bold**.
 */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyBase}-${i}`} className="font-extrabold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyBase}-${i}`}>{part}</React.Fragment>;
  });
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] };

export function parseAnswerBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = (text || '').replace(/\r\n/g, '\n').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    const bullet = line.match(/^\s*(?:[-*•▪]|\u2022)\s+(.*)$/);
    const numbered = line.match(/^\s*\d{1,2}[.)]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,4}\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (heading) {
      blocks.push({ kind: 'h', text: heading[1] });
    } else if (bullet) {
      if (last && last.kind === 'ul') last.items.push(bullet[1]);
      else blocks.push({ kind: 'ul', items: [bullet[1]] });
    } else if (numbered) {
      if (last && last.kind === 'ol') last.items.push(numbered[1]);
      else blocks.push({ kind: 'ol', items: [numbered[1]] });
    } else {
      blocks.push({ kind: 'p', text: line.trim() });
    }
  }
  return blocks;
}

export const RichAnswerText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const blocks = parseAnswerBlocks(text);
  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      {blocks.map((b, i) => {
        if (b.kind === 'h') {
          return (
            <div key={i} className="font-extrabold text-[#064E3B] dark:text-emerald-300">
              {renderInline(b.text, `h${i}`)}
            </div>
          );
        }
        if (b.kind === 'ul') {
          return (
            <ul key={i} className="list-disc ps-4 space-y-0.5 marker:text-emerald-600">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `u${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (b.kind === 'ol') {
          return (
            <ol key={i} className="list-decimal ps-5 space-y-0.5 marker:font-bold marker:text-emerald-700">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `o${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{renderInline(b.text, `p${i}`)}</p>;
      })}
    </div>
  );
};
