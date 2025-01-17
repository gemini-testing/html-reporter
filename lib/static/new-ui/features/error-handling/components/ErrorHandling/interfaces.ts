import {ReactNode, DependencyList, ErrorInfo} from 'react';

export interface BoundaryProps {
    /** Node to display when falling */
    fallback?: ReactNode,
    /** Changing this primitive will update the component forcibly if it crashed with an error. */
    watchFor?: DependencyList;
    children?: ReactNode
}

export interface BoundaryStateAlive {
    hasError: false;
    error: null;
    errorInfo: null;
}

export interface BoundaryStateDead {
    hasError: true;
    error: Error;
    errorInfo: ErrorInfo;
}

export interface BoundaryStateInternal {
    watchFor?: DependencyList
}

export type BoundaryState = (BoundaryStateAlive | BoundaryStateDead) & BoundaryStateInternal;

export interface ErrorContext {
    state: BoundaryStateDead;
    restore(): void;
}
