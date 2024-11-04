import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/bundle.js",
      format: "cjs",
    },
    {
      file: "dist/bundle.min.js",
      format: "umd",
      name: "marching-squares",
      plugins: [terser()],
    },
  ],
  plugins: [
    typescript({
      compilerOptions: { lib: ["es5", "es6", "dom"], target: "es5" },
    }),
  ],
};
