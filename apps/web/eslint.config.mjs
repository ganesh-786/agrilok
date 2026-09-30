import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "public/service-worker.js", "next-env.d.ts"],
  },
  {
    rules: {
      // A bare <img> would skip the responsive, AVIF-first pipeline that keeps
      // pages light on rural connections.
      "@next/next/no-img-element": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Command-line scripts talk to the terminal.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
];

export default config;
