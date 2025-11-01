import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: {
    sourcemap: true,
  },
  entry: "./src/useRouteQuery.ts",
  name: "demershov/useRouteQuery",
  platform: "browser",
  external: ["vue-router", "vue"],
  target: "ES2023",

  minify: false,
  exports: {
    devExports: true,
  },
  publint: true,
});
