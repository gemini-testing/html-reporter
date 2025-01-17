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
