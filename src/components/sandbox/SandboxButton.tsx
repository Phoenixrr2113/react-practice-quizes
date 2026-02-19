import { Suspense, lazy, useState, memo } from 'react';

const ChallengeSandbox = lazy(() =>
  import('./ChallengeSandbox').then((m) => ({ default: m.ChallengeSandbox })),
);

interface SandboxButtonProps {
  code: string;
  testCode?: string;
}

export const SandboxButton = memo(function SandboxButton({ code, testCode }: SandboxButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <div className="mt-3">
        <button
          onClick={() => setIsOpen(false)}
          className="mb-2 text-xs text-muted hover:text-text cursor-pointer bg-transparent border-none font-[inherit]"
        >
          ✕ Close Sandbox
        </button>
        <Suspense
          fallback={
            <div className="bg-surface-2 border border-border rounded-lg p-8 text-center text-muted text-sm">
              Loading sandbox…
            </div>
          }
        >
          <ChallengeSandbox code={code} testCode={testCode} />
        </Suspense>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="mt-3 inline-flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent
                 text-sm font-semibold px-4 py-2 rounded-md cursor-pointer transition-all
                 hover:bg-accent/20 hover:border-accent/50 font-[inherit]"
    >
      ▶ Open in Sandbox
    </button>
  );
});
