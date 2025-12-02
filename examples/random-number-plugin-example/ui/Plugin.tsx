import { ClipboardButton } from "@gravity-ui/uikit";
import { CollapsibleSection, State } from "html-reporter/plugins-sdk/ui";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { fetchRandomNumber } from "./actions";
import styles from "./Plugin.module.css";

/** Props passed by html-reporter to the plugin component */
export interface PluginProps {
    result: {
        id: string;
    };
}

export const RandomNumberPlugin = ({ result }: PluginProps) => {
    const dispatch = useDispatch();
    const [isExpanded, setIsExpanded] = useState(false);
    const testName = useSelector(state => state.tree.results.byId[result.id].suitePath.join(' '));

    const resultState = useSelector(
        (state: State & { plugins: { randomNumber: { byResultId: Record<string, { status: string; value: number | null; error: string | null }> } } }) =>
            state.plugins.randomNumber?.byResultId[result.id]
    );

    const status = resultState?.status ?? "idle";
    const value = resultState?.value;
    const error = resultState?.error;

    useEffect(() => {
        if (isExpanded && status === "idle") {
            dispatch(fetchRandomNumber(result.id));
        }
    }, [isExpanded, status, dispatch, result.id]);

    const handleSectionUpdate = useCallback(
        (expanded: boolean) => {
            if (expanded && status === "idle") {
                dispatch(fetchRandomNumber(result.id));
                setIsExpanded(true);
            }
        },
        [dispatch, result.id, status]
    );

    return (
        <CollapsibleSection
            id="plugins.random-number-plugin-example"
            title="Random Number"
            defaultExpanded={false}
            onUpdate={handleSectionUpdate}
        >
            <div className={styles.container}>
                {status === "loading" && (
                    <span className={styles.loading}>Fetching random number...</span>
                )}

                {status === "loaded" && value !== null && (
                    <div className={styles.result}>
                        <span className={styles.label}>Lucky number for test "{testName}":</span>
                        <span className={styles.number}>{value}</span>
                        <ClipboardButton text={String(value)} size="s" />
                    </div>
                )}

                {status === "error" && (
                    <span className={styles.error}>Error: {error}</span>
                )}

                {status === "idle" && (
                    <span className={styles.label}>
                        Expand this section to get a random number from the server
                    </span>
                )}
            </div>
        </CollapsibleSection>
    );
};

