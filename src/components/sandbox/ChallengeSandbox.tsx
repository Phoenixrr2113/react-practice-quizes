import { useMemo } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackTests,
  SandpackConsole,
} from '@codesandbox/sandpack-react';
import { sandpackDark } from '@codesandbox/sandpack-themes';

interface ChallengeSandboxProps {
  code: string;
  testCode?: string;
}

export function ChallengeSandbox({ code, testCode }: ChallengeSandboxProps) {
  if (testCode) {
    return <TestRunnerSandbox code={code} testCode={testCode} />;
  }
  return <ConsoleSandbox code={code} />;
}

const TEST_DEPS = {
  dependencies: {
    react: '^18.3.1',
    'react-dom': '^18.3.1',
    '@testing-library/dom': '^10.0.0',
    '@testing-library/react': '^16.0.0',
  },
};

function TestRunnerSandbox({ code, testCode }: { code: string; testCode: string }) {
  const files = useMemo(() => ({
    '/implementation.ts': { code: exportWrapped(code), active: true as const },
    // Put tests in add.test.ts since that's the template's test entry point
    '/add.test.ts': { code: testCode, hidden: true },
    '/add.ts': { code: 'export {}', hidden: true },
  }), [code, testCode]);

  const options = useMemo(() => ({
    visibleFiles: ['/implementation.ts'] as string[],
    activeFile: '/implementation.ts' as string,
  }), []);

  return (
    <SandpackProvider
      theme={sandpackDark}
      template="test-ts"
      files={files}
      customSetup={TEST_DEPS}
      options={options}
    >
      <SandpackLayout>
        <SandpackCodeEditor
          showLineNumbers
          showInlineErrors
          style={{ height: 480 }}
        />
        <SandpackTests
          verbose
          style={{ height: 480 }}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}

function ConsoleSandbox({ code }: { code: string }) {
  const files = useMemo(() => ({
    '/App.jsx': {
      code: consoleWrapper(code),
      active: true as const,
    },
  }), [code]);

  return (
    <SandpackProvider
      theme={sandpackDark}
      template="react"
      files={files}
    >
      <SandpackLayout>
        <SandpackCodeEditor
          showLineNumbers
          showInlineErrors
          style={{ height: 480 }}
        />
        <SandpackConsole
          style={{ height: 480 }}
          showHeader
          showResetConsoleButton
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}

/**
 * Wraps user code so that top-level functions are exported,
 * making them importable by the test file.
 */
function exportWrapped(code: string): string {
  const reactImport = `import { useState, useReducer, useRef, useCallback, useMemo, useEffect, useLayoutEffect, useContext, createContext, useSyncExternalStore } from 'react';\n\n`;

  // Replace top-level `function name(` with `export function name(`
  // so tests can import them
  const exported = code.replace(
    /^(function\s+\w+)/gm,
    'export $1',
  );

  return reactImport + exported;
}

/**
 * For console-only fallback: wraps code in a minimal component
 * that renders instructions to use the console.
 */
function consoleWrapper(code: string): string {
  return `${code}

// Try your implementation above and check the console for output.
// Use console.log() to test your code.
export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: 'monospace', color: '#999' }}>
      <p>Use the console panel to test your implementation.</p>
      <p style={{ fontSize: 12, color: '#666' }}>
        Write console.log() calls above to verify your code works.
      </p>
    </div>
  );
}`;
}
