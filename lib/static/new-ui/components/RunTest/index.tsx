import React, {forwardRef, ReactNode, useCallback, useState} from 'react';

import styles from './index.module.css';
import {Button, ButtonProps, Icon, Popover, Hotkey} from '@gravity-ui/uikit';
import {ArrowRotateRight, ChevronDown, Stop} from '@gravity-ui/icons';
import {thunkRunTest, thunkStopTests} from '@/static/modules/actions';
import {useDispatch} from 'react-redux';
import {RunTestsFeature} from '@/constants';
import {useAnalytics} from '../../hooks/useAnalytics';
import type {BrowserEntity} from '@/static/new-ui/types/store';
import {isFeatureAvailable} from '../../utils/features';
import classNames from 'classnames';
import ExtensionPoint, {getExtensionPointComponents} from '../../../components/extension-point';
import * as plugins from '../../../modules/plugins';
import {ExtensionPointName} from '../../constants/plugins';
import {useIsRunning} from '@/static/new-ui/hooks/useIsRunning';
import {useRunOptionsString} from '@/static/new-ui/hooks/useRunOptionsString';

interface RunTestProps {
    browser: BrowserEntity | null;
    buttonText?: string | null;
    buttonProps?: ButtonProps;
    hotkey?: ReactNode;
    className?: ReactNode;
}

export const RunTestButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, RunTestProps>(
    ({browser, buttonProps, buttonText, hotkey, className}, ref) => {
        const isRunning = useIsRunning();
        const runOptionsString = useRunOptionsString();

        const analytics = useAnalytics();
        const dispatch = useDispatch();
        const isRunTestsAvailable = isFeatureAvailable(RunTestsFeature);

        const onRetryTestHandler = (): void => {
            if (browser) {
                analytics?.trackFeatureUsage({featureName: 'Retry test button click in test control panel'});
                dispatch(thunkRunTest({test: {testName: browser.parentId, browserName: browser.name}}));
            }
        };

        if (!isRunTestsAvailable) {
            return null;
        }

        const loadedPluginConfigs = plugins.getLoadedConfigs();
        const pluginComponents = getExtensionPointComponents(loadedPluginConfigs, ExtensionPointName.RunTestOptions);
        const hasRunTestOptions = pluginComponents.length > 0;
        const [isRunOptionsOpen, setIsRunOptionsOpen] = useState(false);
        const onRunOptionsOpenChange = useCallback((open: boolean) => {
            setIsRunOptionsOpen(open);
        }, []);

        const onStopClick = useCallback((): void => {
            dispatch(thunkStopTests());
        }, [thunkStopTests, dispatch]);

        if (isRunning) {
            return (
                <div className={styles.buttonsContainer}>
                    <Button
                        ref={ref as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                        view={'action'}
                        className={classNames(styles.stopButton, className)}
                        onClick={onStopClick}
                        {...buttonProps}
                    >
                        <Icon data={Stop}/>
                        Stop all
                        <Hotkey value="shift+s" view={buttonProps?.view === 'outlined' ? 'light' : 'dark'} />
                    </Button>
                </div>
            );
        }

        return <div className={styles.buttonsContainer}>
            <Button
                ref={ref as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                view={'action'}
                className={classNames(styles.retryButton, className)}
                onClick={onRetryTestHandler}
                disabled={isRunning}
                style={{width: buttonText === null ? '28px' : undefined}}
                pin={hasRunTestOptions ? 'round-brick' : undefined}
                qa='run-test'
                {...buttonProps}
            >
                {isRunning ? 'Running' : <Icon data={ArrowRotateRight}/>}
                {!isRunning && (buttonText === undefined ? 'Retry' : buttonText)}
                {(runOptionsString.length > 0) && <span className={styles.runOptions}>{runOptionsString}</span>}
                {hotkey}
            </Button>
            {hasRunTestOptions && <Popover
                onOpenChange={onRunOptionsOpenChange}
                content={<div className={styles.runOptionsContainer}><ExtensionPoint name={ExtensionPointName.RunTestOptions}></ExtensionPoint></div>}
                trigger='click'
                placement='bottom-end'
            >
                <Button
                    view='action'
                    disabled={isRunning}
                    className={classNames(styles.retryButton, styles.runOptionsButton)}
                    style={{width: buttonText === null ? '28px' : undefined}}
                    pin='brick-round'
                    qa='run-test-options'
                    {...buttonProps}
                >
                    <Icon data={ChevronDown} className={classNames(styles.runOptionsButtonIcon, {[styles.runOptionsButtonIconRotated]: isRunOptionsOpen})}/>
                </Button>
            </Popover>}
        </div>;
    }
);

RunTestButton.displayName = 'RunTestButton';
