import type { State } from "html-reporter/plugins-sdk/ui";

/** Plugin configuration passed from the preset */
export interface PluginConfig {
    // Add your plugin-specific config options here
}

/** State shape for this plugin's Redux store slice */
export interface RandomNumberState {
    byResultId: Record<string, ResultState>;
}

export interface ResultState {
    status: "idle" | "loading" | "loaded" | "error";
    value: number | null;
    error: string | null;
}

// Extend global scope to include pluginOptions injected by html-reporter
declare global {
    const pluginOptions: {
        pluginConfig: PluginConfig;
        /** Base URL for plugin's server endpoints, e.g. "/plugin-routes/random-number-plugin-example" */
        pluginServerEndpointPrefix: string;
    };
}

// Extend react-redux's DefaultRootState to include our plugin state
declare module "react-redux" {
    export interface DefaultRootState extends State {
        plugins: {
            randomNumber: RandomNumberState;
        };
    }
}

export {};
