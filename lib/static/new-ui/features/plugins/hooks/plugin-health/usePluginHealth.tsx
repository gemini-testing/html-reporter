import {ExtensionPointPluginMetadata} from '@/static/new-ui/features/plugins/types';
import React, {useEffect, useMemo, useState} from 'react';
import axios from 'axios';
import {TriangleUp, TriangleDownFill} from '@gravity-ui/icons';
import {Tooltip} from '@gravity-ui/uikit';

import styles from './index.module.css';
import classNames from 'classnames';

type PluginHealth = {
    statusIcon: React.ReactNode | undefined;
};

const wrapError = (error: string): string => `Plugin is unhealthy: ${error}`;

export const usePluginHealth = (plugin: ExtensionPointPluginMetadata): PluginHealth => {
    const [error, setError] = useState<string | null>(null);
    const [pluginUrl] = useState(plugin.PluginComponent.metadata.healthCheckUrl);

    useEffect(() => {
        if (!pluginUrl) {
            return;
        }
        const abortController = new AbortController();
        const checkPlugin = (): void => {
            axios.get(pluginUrl, {signal: abortController.signal}).then((response) => {
                if (response.status !== 200) {
                    setError(wrapError(response.data));
                } else {
                    setError(null);
                }
            }).catch((error) => {
                setError(wrapError(error.message));
                console.error(error);
            });
        };
        checkPlugin();
        const timer = setInterval(checkPlugin, 15_000);

        return (): void => {
            clearInterval(timer);
            abortController.abort();
        };
    }, [pluginUrl]);

    const statusIcon = useMemo(() => {
        if (!pluginUrl) {
            return;
        }
        if (error) {
            return <Tooltip content={error} openDelay={0} offset={8} placement='bottom-start'>
                <div className={styles.iconContainer}>
                    <TriangleDownFill className={classNames(styles.icon, styles.redIconPing)}/>
                    <TriangleDownFill className={classNames(styles.icon, styles.redIcon)}/>
                </div>
            </Tooltip>;
        }
        return <Tooltip content='Plugin is healthy' openDelay={0} offset={8} placement='bottom-start'>
            <div className={styles.iconContainer}>
                <TriangleUp className={classNames(styles.icon, styles.greenIcon)} />
            </div>
        </Tooltip>;
    }, [error]);

    return {statusIcon};
};
