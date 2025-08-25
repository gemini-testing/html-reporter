import React, {forwardRef} from 'react';

import styles from './index.module.css';
import {Button, ButtonProps, Icon, Spin} from '@gravity-ui/uikit';
import {ArrowRotateRight} from '@gravity-ui/icons';
import {thunkRunTest} from '@/static/modules/actions';
import {useDispatch, useSelector} from 'react-redux';
import {RunTestsFeature} from '@/constants';
import {useAnalytics} from '../../hooks/useAnalytics';
import type {BrowserEntity} from '@/static/new-ui/types/store';
import {isFeatureAvailable} from '../../utils/features';

interface RunTestProps {
    browser: BrowserEntity | null;
    buttonText?: string | null;
    buttonProps?: ButtonProps;
}

export const RunTestButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, RunTestProps>(
    ({browser, buttonProps, buttonText}, ref) => {
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <Button ref={ref as any} view={'action'} className={styles.retryButton} onClick={onRetryTestHandler} disabled={isRunning} style={{width: buttonText === null ? '28px' : undefined}} {...buttonProps}>
            {isRunning ? <Spin size={'xs'} /> : <Icon data={ArrowRotateRight}/>}{buttonText === undefined ? 'Retry' : buttonText}
        </Button>;
    }
);

RunTestButton.displayName = 'RunTestButton';
