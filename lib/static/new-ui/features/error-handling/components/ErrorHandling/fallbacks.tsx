import {Divider, Link, Text} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode} from 'react';
import {ErrorInfo as ErrorInfoFc} from '../../../../components/ErrorInfo';
import styles from './index.module.css';
import {useErrorContext} from './context';
import {FileIssue, ReloadPage} from './actions';
import {NEW_ISSUE_LINK} from '@/constants';
import {TestplaneLogo} from '@/static/new-ui/components/MainLayout/logo';
import {ExclamationTriangleLarge} from './exclamation-triangle';

export function FallbackAppCrash(): ReactNode {
    const {state} = useErrorContext();

    return <div className={styles.crashAbsoluteWrapper}>
        <div className={classNames(styles.crash, styles.lined)}>
            <TestplaneLogo width={32} height={32} />

            <div className={styles.divider} />

            <Text variant="subheader-3">Something went wrong</Text>
            <Text variant="body-1" color="secondary">Testplane UI has crashed</Text>

            <div className={styles.divider} />

            <ErrorInfoFc className={styles.errorInfo} name={state.error.name} stack={state.error.stack} />

            <div className={styles.divider} />

            <div className={classNames(styles.actionRow)}>
                <ReloadPage width="max"/>

                <FileIssue width="max"/>
            </div>

            <Text variant="body-1" color="secondary">
                We would appreciate a detailed<br/>
                report with reproduction steps.
            </Text>
        </div>
    </div>;
}

interface FallbackCardCrashProps {
    recommendedAction?: ReactNode;
}

export function FallbackCardCrash({recommendedAction}: FallbackCardCrashProps): ReactNode {
    const {state} = useErrorContext();

    return <div className={classNames(styles.crash)}>
        <ExclamationTriangleLarge width={32} height={32} />

        <Text variant="subheader-3">Something went wrong</Text>
        <Text variant="body-1" color="secondary">The data is corrupted or there’s a bug on our side</Text>

        <ErrorInfoFc className={styles.errorInfo} name={state.error.name} stack={state.error.stack} />

        {typeof recommendedAction === 'string' ? <Text variant="body-1">{recommendedAction}</Text> : recommendedAction}

        {recommendedAction && <div className={classNames(styles.pickActionSeparator)}>
            <Divider className={classNames(styles.pickActionSeparatorLine)} />
            <Text variant="caption-1" color="secondary">OR</Text>
            <Divider className={classNames(styles.pickActionSeparatorLine)} />
        </div>}

        <FileIssue />
    </div>;
}

export function FallbackDataCorruption(): ReactNode {
    const {state} = useErrorContext();

    return <div className={classNames(styles.crash, styles.crashCorruption)}>
        <Text variant="body-1" color="secondary">The data is corrupted or there’s a bug on our side. <Link href={NEW_ISSUE_LINK} target='_blank'>File an issue</Link></Text>

        <ErrorInfoFc className={styles.errorInfo} name={state.error.name} stack={state.error.stack} />
    </div>;
}
