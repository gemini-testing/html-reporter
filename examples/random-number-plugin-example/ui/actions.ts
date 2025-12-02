import axios from "axios";
import type { Dispatch } from "redux";
import type { ThunkAction } from "redux-thunk";
import type { DefaultRootState } from "react-redux";

export const actions = {
    LOADING: "plugins/randomNumber/loading",
    LOADED: "plugins/randomNumber/loaded",
    ERROR: "plugins/randomNumber/error",
} as const;

interface LoadingAction {
    type: typeof actions.LOADING;
    payload: { resultId: string };
}

interface LoadedAction {
    type: typeof actions.LOADED;
    payload: { resultId: string; value: number };
}

interface ErrorAction {
    type: typeof actions.ERROR;
    payload: { resultId: string; error: string };
}

export type Action = LoadingAction | LoadedAction | ErrorAction;

export const fetchRandomNumber = (
    resultId: string
): ThunkAction<Promise<void>, DefaultRootState, unknown, Action> => {
    return async (dispatch: Dispatch<Action>) => {
        dispatch({ type: actions.LOADING, payload: { resultId } });

        const endpoint = `${pluginOptions.pluginServerEndpointPrefix}/random`;

        try {
            const { data } = await axios.get<{ value: number }>(endpoint);
            dispatch({
                type: actions.LOADED,
                payload: { resultId, value: data.value },
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            dispatch({
                type: actions.ERROR,
                payload: { resultId, error: message },
            });
        }
    };
};
