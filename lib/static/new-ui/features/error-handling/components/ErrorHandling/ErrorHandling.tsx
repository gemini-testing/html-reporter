import React, {ReactNode, Component, ErrorInfo} from 'react';
import {ErrorInfo as ErrorInfoFc} from '../../../../components/ErrorInfo';
import styles from './ErrorHandling.module.css';
import classNames from 'classnames';
import {Button, Divider, Icon, Link, Text} from '@gravity-ui/uikit';
import {TriangleExclamation, ArrowsRotateLeft} from '@gravity-ui/icons';
import GithubIcon from '../../../../../icons/github-icon.svg';
import TestplaneIcon from '../../../../../icons/testplane-mono-black.svg';

type WatchDependency = React.DependencyList;

interface BoundaryProps {
    /** Node to display when falling */
    fallback?: ReactNode,
    /** Changing this primitive will update the component forcibly if it crashed with an error. */
    watchFor?: WatchDependency;
    children?: ReactNode

}

interface BoundaryStateAlive {

    hasError: false;
    error: null;
    errorInfo: null;
}

interface BoundaryStateDead {
    hasError: true;
    error: Error;
    errorInfo: ErrorInfo;
}

interface BoundaryStateInternal {
    watchFor?: WatchDependency
}

type BoundaryState = (BoundaryStateAlive | BoundaryStateDead) & BoundaryStateInternal;

interface ErrorContext {
    state: BoundaryStateDead;
    restore(): void;
}

const ErrorContext = React.createContext<ErrorContext | null>(null);

const ErrorContextProvider = ErrorContext.Provider;

export const useErrorContext = (): ErrorContext => {
    const ctx = React.useContext(ErrorContext);

    if (ctx === null) {
        throw new Error('useErrorContext must be used within ErrorContextProvider');
    }

    return ctx;
};

class Boundary extends Component<BoundaryProps, BoundaryState> {
    constructor(props: BoundaryProps) {
        super(props);
        this.state = {
            watchFor: props.watchFor,
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    private static messageStyle = 'background: crimson; color: white;';
    private static timestampStyle = 'color: gray; font-size: smaller';

    private static isNothingChanged(prev?: WatchDependency, next?: WatchDependency): boolean {
        if (prev === next) {
            return true;
        }

        if (prev === undefined || next === undefined) {
            return false;
        }

        if (prev.length !== next.length) {
            return false;
        }

        return prev.every((item, index) => item === next[index]);
    }

    private restore(): void {
        this.setState({hasError: false, error: null});
    }

    static getDerivedStateFromProps(nextProps: BoundaryProps, prevState: BoundaryState): null | BoundaryState {
        if (Boundary.isNothingChanged(prevState.watchFor, nextProps.watchFor)) {
            return null;
        }

        return {...prevState, error: null, hasError: false, errorInfo: null, watchFor: nextProps.watchFor};
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({hasError: true, error, errorInfo});

        const timestamp = new Date().toTimeString();

        console.groupCollapsed(
            `%cError boundary catched error named "${error.name}". See details below:` + '%c @ ' + timestamp,
            Boundary.messageStyle,
            Boundary.timestampStyle
        );

        console.error(error);
        console.error('Component stack: ', errorInfo.componentStack);
        console.groupEnd();
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <ErrorContextProvider value={{state: this.state, restore: this.restore.bind(this)}}>
                    {this.props.fallback}
                </ErrorContextProvider>
            );
        }

        return this.props.children;
    }
}

const ISSUE_LINK = 'https://github.com/gemini-testing/html-reporter/issues/new?template=1-bug-report.yaml';

function reportIssue(): void {
    window.open(ISSUE_LINK, '_blank');
}

function FileIssue(): ReactNode {
    return <Button view="outlined" onClick={reportIssue}>
        <img src={GithubIcon} alt="icon" />
        File an issue
    </Button>;
}

function reloadPage(): void {
    window.location.reload();
}

function ReloadPage(): ReactNode {
    return <Button view="outlined" onClick={reloadPage}>
        <Icon data={ArrowsRotateLeft} />
        Refresh this page
    </Button>;
}

function AppCrash(): ReactNode {
    const {state} = useErrorContext();

    return <div className={styles.crashAbsoluteWrapper}>
        <div className={classNames(styles.crash)}>
            <img src={TestplaneIcon} alt="icon" width={32} height={32}/>

            <Text variant="subheader-3">Something went wrong</Text>
            <Text variant="body-1" color="secondary">Testplane UI has crashed</Text>

            <ErrorInfoFc className={styles.errorInfo} name={state.error.name} stack={state.error.stack} />

            <div className={classNames(styles.actionRow)}>
                <ReloadPage />

                <FileIssue />
            </div>
        </div>
    </div>;
}

function CardCrash(): ReactNode {
    const {state} = useErrorContext();

    return <div className={classNames(styles.crash)}>
        <Icon data={TriangleExclamation} size={52}/>

        <Text variant="subheader-3">Something went wrong</Text>
        <Text variant="body-1" color="secondary">The data is corrupted or there’s a bug on our side</Text>

        <ErrorInfoFc className={styles.errorInfo} name={state.error.name} stack={state.error.stack} />

        <Text variant="body-1">Try choosing another item</Text>

        <div className={classNames(styles.pickActionSeparator)}>
            <Divider className={classNames(styles.pickActionSeparatorLine)} />
            <Text variant="caption-1" color="secondary">OR</Text>
            <Divider className={classNames(styles.pickActionSeparatorLine)} />
        </div>

        <FileIssue />
    </div>;
}

function DataCorruption(): ReactNode {
    const {state} = useErrorContext();

    return <div className={classNames(styles.crash)}>
        <Text variant="body-1" color="secondary">The data is corrupted or there’s a bug on our side. <Link href={ISSUE_LINK} target='_blank'>File an issue</Link></Text>

        <ErrorInfoFc className={styles.errorInfo} name={state.error.name} stack={state.error.stack} />
    </div>;
}

export const ErrorHandler = {
    Root: Boundary,
    AppCrash,
    CardCrash,
    DataCorruption
};
