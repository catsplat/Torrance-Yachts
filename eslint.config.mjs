import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".artifacts/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "playwright/.auth/**",
    "test-results/**",
    // Rust/Tauri generates JavaScript glue under this build directory. It is not
    // application source and must not affect the Next.js lint gate.
    "src-tauri/target/**",
  ]),
]);

export default eslintConfig;
