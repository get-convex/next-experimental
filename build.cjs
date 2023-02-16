#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");
const process = require("process");

// see https://github.com/pmndrs/zustand/pull/829
let fixUseSyncExternalStoreShimEsm = {
  name: "fix useSyncExternalStore shim",
  setup(build) {
    build.onLoad({ filter: /convex\/src\/react/ }, async args => {
      const source = await fs.promises.readFile(args.path, "utf8");
      const contents = source.replace(
        "use-sync-external-store/shim",
        "use-sync-external-store/shim/index.js"
      );
      return { contents, loader: args.path.match(/tsx?$/) ? "ts" : "js" };
    });
  },
};

// esbuild is a bundler, but we're not bundling
const allSourceFiles = [...walkSync("src")].filter(name => {
  if (name.startsWith("api")) {
    console.log("api:", name);
  }
  if (name.includes("test")) return false;
  // .d.ts files are manually copied over
  if (name.endsWith(".d.ts")) return false;
  return (
    name.endsWith(".ts") ||
    name.endsWith(".tsx") ||
    name.endsWith(".js") ||
    name.endsWith(".jsx")
  );
});

if (process.argv.includes("esm")) {
  require("esbuild")
    .build({
      entryPoints: allSourceFiles,
      bundle: false,
      sourcemap: true,
      outdir: "dist/esm",
      plugins: [fixUseSyncExternalStoreShimEsm],
      target: "es2020",
    })
    .catch(() => process.exit(1));
}

if (process.argv.includes("cjs")) {
  require("esbuild")
    .build({
      entryPoints: allSourceFiles,
      format: "cjs",
      bundle: false,
      sourcemap: true,
      outdir: "dist/cjs",
      target: "es2020",
    })
    .catch(() => process.exit(1));
}

function* walkSync(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      yield* walkSync(path.join(dir, file.name));
    } else {
      yield path.join(dir, file.name);
    }
  }
}
