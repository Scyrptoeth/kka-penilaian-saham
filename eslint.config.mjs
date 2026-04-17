import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const noHardcodedUiStrings = require("./eslint-rules/no-hardcoded-ui-strings.js");

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
    // CommonJS build scripts + custom ESLint rules
    "scripts/**/*.cjs",
    "eslint-rules/**",
  ]),
  // Project-local i18n enforcement. Session 029.
  {
    files: ["src/**/*.tsx"],
    plugins: {
      local: {
        rules: {
          "no-hardcoded-ui-strings": noHardcodedUiStrings,
        },
      },
    },
    rules: {
      "local/no-hardcoded-ui-strings": "error",
    },
  },
]);

export default eslintConfig;
