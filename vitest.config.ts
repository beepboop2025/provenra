import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      // Scope coverage to the pure-logic core that is unit-testable without a
      // browser, network, DB, or API keys. UI (React Three Fiber / Recharts),
      // Next.js routes, and I/O-bound intel collectors are intentionally
      // excluded so the reported number reflects logic actually under test.
      include: [
        "src/lib/analytics.ts",
        "src/lib/format.ts",
        "src/lib/kpis.ts",
        "src/lib/risk.ts",
        "src/lib/utils.ts",
        "src/lib/data/engine.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
