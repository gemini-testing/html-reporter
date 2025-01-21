import {Divider, Link, Text} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode} from 'react';
import TestplaneIcon from '../../../../../icons/testplane-mono-black.svg';
import ExclamationTriangleLarge from '../../../../../icons/exclamation-triangle-large.svg';
import {ErrorInfo as ErrorInfoFc} from '../../../../components/ErrorInfo';
import styles from './index.module.css';
import {useErrorContext} from './context';
import {FileIssue, ReloadPage} from './actions';
import {NEW_ISSUE_LINK} from '@/constants';

export function FallbackAppCrash(): ReactNode {
    const {state} = useErrorContext();

    return <div className={styles.crashAbsoluteWrapper}>
        <div className={classNames(styles.crash, styles.lined)}>
            <img src={TestplaneIcon} alt="icon" width={32} height={32}/>

            <div className={styles.divider} />

            <Text variant="subheader-3">Something went wrong</Text>
            <Text variant="body-1" color="secondary">Testplane UI has crashed</Text>

            <div className={styles.divider} />

            <ErrorInfoFc clipStack={50} className={styles.errorInfo} name={state.error.name} stack={state.error.stack} />

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

export function FallbackCardCrash(): ReactNode {
    const {state} = useErrorContext();

    return <div className={classNames(styles.crash)}>
        <img src={ExclamationTriangleLarge} alt="icon" width={32} height={32} />

        <Text variant="subheader-3">Something went wrong</Text>
        <Text variant="body-1" color="secondary">The data is corrupted or there’s a bug on our side</Text>

        <ErrorInfoFc clipStack={50} className={styles.errorInfo} name={state.error.name} stack={state.error.stack} />

        <Text variant="body-1">Try choosing another item</Text>

        <div className={classNames(styles.pickActionSeparator)}>
            <Divider className={classNames(styles.pickActionSeparatorLine)} />
            <Text variant="caption-1" color="secondary">OR</Text>
            <Divider className={classNames(styles.pickActionSeparatorLine)} />
        </div>

        <FileIssue />
    </div>;
}

export function FallbackDataCorruption(): ReactNode {
    const {state} = useErrorContext();

    return <div className={classNames(styles.crash, styles.dense)}>
        <Text variant="body-1" color="secondary">The data is corrupted or there’s a bug on our side. <Link href={NEW_ISSUE_LINK} target='_blank'>File an issue</Link></Text>

        <ErrorInfoFc clipStack={50} className={styles.errorInfo} name={state.error.name} stack={state.error.stack} />
    </div>;
}
