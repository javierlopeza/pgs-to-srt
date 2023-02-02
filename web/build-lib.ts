import { denoPlugin } from "esbuild_plugin_deno_loader";
import * as esbuild from "esbuild";
import { configPath, configVal } from "./conf.ts";
import * as path from "std/path/mod.ts";
import { fromFileUrl } from "std/path/mod.ts";
import * as dnt from "dnt";

export { workerBuildPath };

const IMPORT_MAP_PATH_REL = "../import_map.json";
const importMapPath = import.meta.resolve(IMPORT_MAP_PATH_REL);
const importMapURL = new URL(importMapPath);

// the shim is needed for the worker to work sa non-module (IIFE), which is needed for Firefox
const urlShimPath = fromFileUrl(
  import.meta.resolve("./import-meta-url-shim.js"),
);

const buildDir = configPath("buildDir");
const workerPath = configPath("worker");
const workerBuildPath = path.join(buildDir, configVal("outWorkerFile"));

async function main() {
  // compile lib
  const libPath = configPath("lib");
  const buildNodePackageDir = configPath("buildNodePackageDir");
  dnt.build({
    compilerOptions: {
      // necessary for deno async/pool...
      lib: ["dom", "esnext"],
    },
    entryPoints: [libPath],
    importMap: importMapPath,
    outDir: buildNodePackageDir,
    shims: {
      deno: false,
    },
    package: {
      name: "pgs-to-srt-web-lib",
    },
    // TODO: sadly this currently throws TS7053 on std@0.175.0/async/pool.ts
    typeCheck: false,
    test: false,
  });

  // compile worker
  await bundleDenoTs(workerPath, workerBuildPath, "iife");
}

export async function bundleDenoTs(
  sourcePath: string,
  outfile: string,
  format: "esm" | "iife",
) {
  const buildOptions = {
    bundle: true,
    entryPoints: [sourcePath],
    format: format,
    outfile,
    plugins: [denoPlugin({ importMapURL })],
    sourcemap: true,
  };
  if (format === "iife") {
    buildOptions.inject = [urlShimPath];
  }
  await esbuild.build(buildOptions);
  esbuild.stop();
}

if (import.meta.main) {
  await main();
}
