import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig({
    build: {
        lib: {
            entry: "src/engine/index.ts",
            name: "basicEngine",
            fileName: (format) => `basic-engine.${format}.js`,
            formats: ["es", "cjs", "umd"],
        },
    },
    plugins: [
        dts({
            insertTypesEntry: true,
        }),
    ],
})
