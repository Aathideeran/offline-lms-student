/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface FormattedTextProps {
  text: string;
}

function renderInlineFormatting(line: string): React.ReactNode[] {
  // Replace simple LaTeX math tokens like $2^{n-k}$ or \frac{xy}{x+y} with readable notation
  const cleanedMath = line
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\times/g, '×')
    .replace(/\\cup/g, '∪')
    .replace(/\\cap/g, '∩')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\%/g, '%')
    .replace(/\$([^$]+)\$/g, '$1');

  const parts = cleanedMath.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-900 font-mono text-[11.5px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
          return <div key={idx} className="h-1" />;
        }
        if (line === '---') {
          return <hr key={idx} className="my-2.5 border-slate-200" />;
        }
        if (line.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-xs font-bold text-[#0f6b3e] pt-1">
              {renderInlineFormatting(line.slice(5))}
            </h4>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm font-bold text-slate-900 pt-1">
              {renderInlineFormatting(line.slice(4))}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-sm font-bold text-slate-900 pt-1.5">
              {renderInlineFormatting(line.slice(3))}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-base font-bold text-slate-900 pt-1.5">
              {renderInlineFormatting(line.slice(2))}
            </h1>
          );
        }
        if (line.match(/^\s*-\s+/)) {
          const indent = line.startsWith('  ') ? 'pl-5' : 'pl-3';
          return (
            <div key={idx} className={`flex items-start gap-2 ${indent}`}>
              <span className="text-[#0f6b3e] font-bold select-none">•</span>
              <div className="flex-1">{renderInlineFormatting(line.replace(/^\s*-\s+/, ''))}</div>
            </div>
          );
        }
        if (line.match(/^\d+\.\s+/)) {
          const numMatch = line.match(/^(\d+\.)\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="font-semibold text-slate-800 shrink-0">{numMatch[1]}</span>
                <div className="flex-1">{renderInlineFormatting(numMatch[2])}</div>
              </div>
            );
          }
        }
        return <p key={idx}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
};
