/** @type {import('jest').Config} */
// ESM packages that ship untranspiled (react-markdown + the unified stack).
// Keep this list in sync when bumping those deps — Jest must transform them.
const esModules = [
  'react-markdown',
  'remark-gfm',
  'remark-parse',
  'remark-rehype',
  'rehype-react',
  'unified',
  'bail',
  'devlop',
  'unist-.*',
  'hast-.*',
  'mdast-.*',
  'micromark.*',
  'decode-named-character-reference',
  'character-entities',
  'property-information',
  'html-url-attributes',
  'vfile.*',
  'trough',
  'extend',
  'is-plain-obj',
  'comma-separated-tokens',
  'space-separated-tokens',
  'trim-lines',
  'ccount',
  'escape-string-regexp',
  'markdown-table',
  'zwitch',
  'longest-streak',
  'mdast-util-.*',
  'hast-util-.*',
  'unist-util-.*',
  'remark-.*',
  'rehype-.*',
  'stringify-entities',
  'estree-util-.*',
  'mdast-util-from-markdown',
  'mdast-util-to-hast',
  'mdast-util-to-markdown'
].join('|');

export default {
  // @swc/jest transpiles only (no per-file type-check); type-checking is the
  // build's job (`tsc`, TypeScript 7 native). legacyDecorator+decoratorMetadata
  // mirror the tsconfig flags InversifyJS requires.
  // SPEC-PRD-0013-P1 T-01: also transform .js/.mjs so ESM-only deps
  // (react-markdown / unified) transpile under Jest.
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true, decorators: true },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            react: { runtime: 'automatic' }
          },
          target: 'es2021'
        },
        module: { type: 'commonjs' }
      }
    ]
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // The Tauri IPC module is mocked in tests; never import the real @tauri-apps/api.
  moduleNameMapper: {
    '^@tauri-apps/api/core$': '<rootDir>/src/__tests__/__mocks__/tauri-core.ts',
    // ESM packages use extensioned relative imports (./lib/index.js).
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: [
    `[/\\\\]node_modules[/\\\\](?!${esModules}).+\\.(js|jsx|mjs|cjs|ts|tsx)$`
  ]
};
