export interface StaticAccepterImage {
    /** HTTP(S) source URL. Relative URLs are resolved against the report page. */
    image: string;
    /** Repository-relative path, relative to repositoryUrl. */
    path: string;
}

export type StaticAccepterPayloadV2 = readonly StaticAccepterImage[] | Readonly<Record<string, string>>;

export type StaticAccepterTheme = 'light' | 'dark';

export interface StaticAccepterConfig {
    repositoryUrl: string;
    pullRequestUrl: string;
    /** Integer from 1 to 32. Server defaults to 16. */
    downloadConcurrency?: number;
}

export type StaticAccepterProgressPhase =
    | 'downloading'
    | 'committing'
    | 'waiting-for-confirmation'
    | 'submitting'
    | 'suggesting';

export interface StaticAccepterProgress {
    phase: StaticAccepterProgressPhase;
    completed: number;
    total: number;
}

export interface StaticAccepterResult {
    status: 'submitted' | 'suggested' | 'cancelled';
}

export interface StaticAccepterOptions {
    message: string;
    config: StaticAccepterConfig;
    theme?: StaticAccepterTheme;
    onProgressChange?: (progress: StaticAccepterProgress) => void;
}

export interface StaticAccepterModule {
    default(images: StaticAccepterPayloadV2, options: StaticAccepterOptions): Promise<StaticAccepterResult>;
}

export type StaticAccepterModuleLoader = (moduleUrl: string) => Promise<StaticAccepterModule>;

export interface StaticAccepterClientV2 {
    preload(moduleUrl: string): Promise<StaticAccepterModule>;
    start(
        moduleUrl: string,
        images: StaticAccepterPayloadV2,
        options: StaticAccepterOptions,
    ): Promise<StaticAccepterResult>;
}

const POPUP_BLOCKED_ERROR_MESSAGE = 'confirmation popup was blocked by the browser';

export const isStaticAccepterPopupBlockedError = (error: unknown): boolean => {
    return error instanceof Error && error.message.includes(POPUP_BLOCKED_ERROR_MESSAGE);
};

const importStaticAccepterModule: StaticAccepterModuleLoader = (moduleUrl) => {
    const suffix = `${moduleUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

    // Webpack ignore is essential so it would not try to bundle it during build time
    return import(/* webpackIgnore: true */ moduleUrl + suffix);
};

export const createStaticAccepterClientV2 = (
    loadModule: StaticAccepterModuleLoader = importStaticAccepterModule
): StaticAccepterClientV2 => {
    let loadedModule: StaticAccepterModule | null = null;
    let loadedModuleUrl: string | null = null;
    let modulePromise: Promise<StaticAccepterModule> | null = null;
    let modulePromiseUrl: string | null = null;
    let operationInProgress = false;

    const preload = (moduleUrl: string): Promise<StaticAccepterModule> => {
        if (loadedModule && loadedModuleUrl === moduleUrl) {
            return Promise.resolve(loadedModule);
        }

        if (modulePromise && modulePromiseUrl === moduleUrl) {
            return modulePromise;
        }

        modulePromiseUrl = moduleUrl;
        modulePromise = loadModule(moduleUrl)
            .then((staticAccepterModule) => {
                if (typeof staticAccepterModule?.default !== 'function') {
                    throw new Error('Static Accepter module has no default export');
                }

                loadedModule = staticAccepterModule;
                loadedModuleUrl = moduleUrl;

                return staticAccepterModule;
            })
            .catch((error) => {
                if (modulePromiseUrl === moduleUrl) {
                    modulePromise = null;
                    modulePromiseUrl = null;
                }

                throw error;
            });

        return modulePromise;
    };

    const start = (
        moduleUrl: string,
        images: StaticAccepterPayloadV2,
        options: StaticAccepterOptions
    ): Promise<StaticAccepterResult> => {
        if (!loadedModule || loadedModuleUrl !== moduleUrl) {
            throw new Error('Static Accepter module is not loaded yet');
        }

        if (operationInProgress) {
            throw new Error('Static Accepter operation is already in progress');
        }

        operationInProgress = true;

        try {
            // Static accepter opens its popup synchronously inside this call.
            // It should be kept before any "await" in order for popup to not be blocked by browser
            const operation = loadedModule.default(images, options);

            return Promise.resolve(operation).finally(() => {
                operationInProgress = false;
            });
        } catch (error) {
            operationInProgress = false;
            throw error;
        }
    };

    return {preload, start};
};

const staticAccepterClientV2 = createStaticAccepterClientV2();

export const preloadStaticAccepter = staticAccepterClientV2.preload;
export const startStaticAccepter = staticAccepterClientV2.start;
