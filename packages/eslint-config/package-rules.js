import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

/**
 * ESLint config for shared packages inside packages/*.
 *
 * Key rule: packages must never import from apps/* or platform-specific
 * libraries (next, expo, react-native). Violations are errors, not warnings,
 * because they break the shared/platform boundary that the whole architecture
 * depends on.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: { turbo: turboPlugin },
    rules: { "turbo/no-undeclared-env-vars": "warn" },
  },
  {
    plugins: { onlyWarn },
  },
  // ── Dependency boundary rules for shared packages ─────────────────────────
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["apps/*", "../apps/*", "../../apps/*"],
              message:
                "Shared packages must not import from apps/. Move shared logic into packages/ instead.",
            },
            {
              group: ["next", "next/*"],
              message:
                "Shared packages must not import from Next.js. Use platform-agnostic APIs only.",
            },
            {
              group: ["expo", "expo/*", "expo-*"],
              message:
                "Shared packages must not import from Expo. Use platform-agnostic APIs only.",
            },
            {
              group: ["react-native", "react-native/*", "@react-native/*"],
              message:
                "Shared packages must not import from React Native. Use platform-agnostic APIs only.",
            },
          ],
        },
      ],
      // Disallow any — shared packages must be fully typed
      "@typescript-eslint/no-explicit-any": "error",
      // Disallow non-null assertions — be explicit about nullability
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
