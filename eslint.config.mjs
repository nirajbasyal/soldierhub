// ESLint flat config for Next.js 16.
//
// Imports the flat config directly from `eslint-config-next/core-web-vitals`
// rather than going through FlatCompat.

import nextVitals from "eslint-config-next/core-web-vitals";

const nextConfig = Array.isArray(nextVitals) ? nextVitals : [nextVitals];

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextConfig,

  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },

  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;