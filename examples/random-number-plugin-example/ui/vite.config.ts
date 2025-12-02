import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import { resolve } from "path";

/**
 * This plugin wraps the bundle output in a format that html-reporter understands.
 * It injects the plugin code and provides access to shared dependencies.
 */
const wrapForHtmlReporter = () => {
    return {
        name: "wrap-for-html-reporter",
        enforce: "post" as const,
        generateBundle(_options: unknown, bundle: Record<string, { type: string; code?: string }>) {
            const chunk = bundle["plugin.js"];
            if (chunk && chunk.type === "chunk") {
                // The wrapper provides access to shared dependencies (react, redux, etc.)
                // and exposes pluginOptions with config and server endpoint prefix
                chunk.code = `__testplane_html_reporter_register_plugin__([
    'axios', 'classnames', 'react', 'react-dom', '@gravity-ui/uikit',
    'react-redux', 'html-reporter/plugins-sdk/ui', 'components',
    function(axios, classnames, React, ReactDOM, gravity, reactRedux, ReporterUISDK, components, pluginOptions) {
${chunk.code}
        return __testplane_html_reporter_register_plugin__;
    }
]);`;
            }
        },
    };
};

const isDev = process.env.NODE_ENV === "development";

export default defineConfig({
    plugins: [react(), cssInjectedByJsPlugin(), wrapForHtmlReporter()],
    define: {
        "process.env.NODE_ENV": JSON.stringify(isDev ? "development" : "production"),
    },
    build: {
        outDir: resolve(__dirname, "build"),
        minify: !isDev,
        sourcemap: isDev,
        lib: {
            entry: resolve(__dirname, "index.tsx"),
            name: "__testplane_html_reporter_register_plugin__",
            fileName: () => "plugin.js",
            formats: ["iife"],
        },
        rollupOptions: {
            // These dependencies are provided by html-reporter at runtime
            external: [
                "axios",
                "classnames",
                "react",
                "react-dom",
                "@gravity-ui/uikit",
                "react-redux",
                "html-reporter/plugins-sdk/ui",
                "components",
            ],
            output: {
                globals: {
                    axios: "axios",
                    classnames: "classnames",
                    react: "React",
                    "react-dom": "ReactDOM",
                    "@gravity-ui/uikit": "gravity",
                    "react-redux": "reactRedux",
                    components: "components",
                    "html-reporter/plugins-sdk/ui": "ReporterUISDK",
                },
            },
        },
    },
});

