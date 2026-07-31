/// <reference types="vite/client" />

// Side-effect CSS imports are handled by Vite, not tsc. TypeScript 7 enables
// noUncheckedSideEffectImports by default, so the module shape must exist.
declare module "*.css";
