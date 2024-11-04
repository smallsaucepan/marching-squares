import { defineConfig, type Options } from "tsup";

const baseOptions: Options = {
  clean: true,
  dts: true,
  entry: ["index.ts"],
  minify: false,
  skipNodeModulesBundle: true,
  sourcemap: true,
  target: "es2017",
  tsconfig: "./tsconfig.json",
  keepNames: true,
  cjsInterop: true,
  splitting: true,
};

export default [
  defineConfig({
    ...baseOptions,
    outDir: "dist/cjs",
    format: "cjs",
  }),
  defineConfig({
    ...baseOptions,
    outDir: "dist/esm",
    format: "esm",
  }),
];