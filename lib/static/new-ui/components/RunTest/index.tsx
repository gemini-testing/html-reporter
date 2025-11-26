import React, {forwardRef, ReactNode, useCallback, useState} from 'react';

import styles from './index.module.css';
import {Button, ButtonProps, Icon, Popover, Spin} from '@gravity-ui/uikit';
import {ArrowRotateRight, ChevronDown} from '@gravity-ui/icons';
import {thunkRunTest} from '@/static/modules/actions';
import {useDispatch, useSelector} from 'react-redux';
import {RunTestsFeature} from '@/constants';
import {useAnalytics} from '../../hooks/useAnalytics';
import type {BrowserEntity} from '@/static/new-ui/types/store';
import {isFeatureAvailable} from '../../utils/features';
import classNames from 'classnames';
import ExtensionPoint, {getExtensionPointComponents} from '../../../components/extension-point';
import * as plugins from '../../../modules/plugins';
import {ExtensionPointName} from '../../constants/plugins';

interface RunTestProps {
    browser: BrowserEntity | null;
    buttonText?: string | null;
    buttonProps?: ButtonProps;
    hotkey?: ReactNode;
}

export const RunTestButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, RunTestProps>(
    ({browser, buttonProps, buttonText, hotkey}, ref) => {
        const isRunning = useSelector(state => state.running);

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

        return <div className={styles.buttonsContainer}>
            <Button
                ref={ref as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                view={'action'}
                className={styles.retryButton}
                onClick={onRetryTestHandler}
                disabled={isRunning}
                style={{width: buttonText === null ? '28px' : undefined}}
                pin={hasRunTestOptions ? 'round-brick' : undefined}
                {...buttonProps}
            >
                {isRunning ? <Spin size={'xs'} /> : <Icon data={ArrowRotateRight}/>}{buttonText === undefined ? 'Retry' : buttonText}{hotkey}
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
                    {...buttonProps}
                >
                    <Icon data={ChevronDown} className={classNames(styles.runOptionsButtonIcon, {[styles.runOptionsButtonIconRotated]: isRunOptionsOpen})}/>
                </Button>
            </Popover>}
        </div>;
    }
);

RunTestButton.displayName = 'RunTestButton';
