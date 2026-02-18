import { codeToHtml } from 'shiki';
import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = 'jsx', className }: CodeBlockProps) {
  const [html, setHtml] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    codeToHtml(code, { lang: language, theme: 'one-dark-pro' }).then(setHtml);
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative group', className)}>
      <div
        className="overflow-x-auto rounded-lg border border-border text-[13px] leading-relaxed [&_pre]:!m-0 [&_pre]:!p-[18px_20px] [&_pre]:!bg-[#0d0d18]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity
                   bg-surface-2 border border-border text-muted text-xs px-2 py-1 rounded cursor-pointer"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
