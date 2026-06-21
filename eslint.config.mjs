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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Immersive 3D landing / editorial shell — out of scope for linting.
    "src/app/intro/**",
    "src/components/landing/**",
    "src/components/promo/**",
    "src/components/command/**",
  ]),
]);

export default eslintConfig;
