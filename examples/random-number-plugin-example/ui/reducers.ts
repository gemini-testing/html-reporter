import type { produce as ImmerProduce } from "immer";
import { get } from "lodash";

import { actions, type Action } from "./actions";
import type { RandomNumberState, ResultState } from "./types";
import type { DefaultRootState } from "react-redux";

const defaultResultState: ResultState = {
    status: "idle",
    value: null,
    error: null,
};

const defaultPluginState: RandomNumberState = {
    byResultId: {},
};

export function mkReducers(
    produce: typeof ImmerProduce
): Array<(state: DefaultRootState, action: Action) => DefaultRootState> {
    return [
        produce((draft: DefaultRootState, action: Action): void => {
            // Initialize plugin state if not present
            if (!get(draft, "plugins.randomNumber")) {
                draft.plugins = {
                    ...draft.plugins,
                    randomNumber: { ...defaultPluginState },
                };
            }

            const pluginState = draft.plugins.randomNumber;

            switch (action.type) {
                case actions.LOADING: {
                    const { resultId } = action.payload;
                    pluginState.byResultId[resultId] = {
                        ...defaultResultState,
                        status: "loading",
                    };
                    break;
                }

                case actions.LOADED: {
                    const { resultId, value } = action.payload;
                    pluginState.byResultId[resultId] = {
                        status: "loaded",
                        value,
                        error: null,
                    };
                    break;
                }

                case actions.ERROR: {
                    const { resultId, error } = action.payload;
                    pluginState.byResultId[resultId] = {
                        status: "error",
                        value: null,
                        error,
                    };
                    break;
                }
            }
        }),
    ];
}
