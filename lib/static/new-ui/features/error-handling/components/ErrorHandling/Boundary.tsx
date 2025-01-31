import React, {Component, DependencyList, ErrorInfo, ReactNode} from 'react';
import {BoundaryProps, BoundaryState} from './interfaces';
import {ErrorContextProvider} from './context';

export class Boundary extends Component<BoundaryProps, BoundaryState> {
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

    private static isNothingChanged(prev?: DependencyList, next?: DependencyList): boolean {
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

    private componentDidCatchErrorInstance(error: Error, errorInfo: ErrorInfo): void {
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

    private componentDidCatchSomethingWeird(notAnError: unknown, errorInfo: ErrorInfo): void {
        this.setState({hasError: true, error: new Error(`Unknown error, based on ${typeof notAnError} value provided.\nReceived value: ${notAnError}, which is not an Error instance.\nTry check your code for throwing ${typeof notAnError}s.`), errorInfo});

        const timestamp = new Date().toTimeString();

        console.groupCollapsed(
            `%cError boundary catched ${typeof notAnError} instead of Error class instance. Try check your code for throwing ${typeof notAnError}s. See details below:` + '%c @ ' + timestamp,
            Boundary.messageStyle,
            Boundary.timestampStyle
        );

        console.log(`Received ${typeof notAnError} value: `, notAnError);
        console.error('Component stack: ', errorInfo.componentStack);
        console.groupEnd();
    }

    /**
     * @param _error - The value throwed from the child component. This is not necessarily an Error class instance because of the ability to throw anything in JS.
     * @param errorInfo - React specific object, contains useful componentStack parameter.
     */
    componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
        if (error instanceof Error) {
            return this.componentDidCatchErrorInstance(error, errorInfo);
        }

        return this.componentDidCatchSomethingWeird(error, errorInfo);
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
