import { defineConfig } from "tsup";
import { config } from "dotenv";

// Load .env.local so env vars are available at build time
config({ path: ".env.local" });

export default defineConfig({
  entry: ["./electron/src/main.ts", "./electron/src/preload.ts"],
  splitting: false,
  sourcemap: false,
  clean: true,
  cjsInterop: true,
  skipNodeModulesBundle: true,
  treeshake: true,
  outDir: "build",
  external: ["electron"],
  format: ["cjs"],
  bundle: true,
  // Inject env vars at build time (loaded from .env.local or CI environment)
  define: {
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"),
    "process.env.NEXT_PUBLIC_MEMORY_API_URL": JSON.stringify(process.env.NEXT_PUBLIC_MEMORY_API_URL || "http://localhost:8000"),
  },
});
