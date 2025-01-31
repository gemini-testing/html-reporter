import React from 'react';
import {ErrorContext} from './interfaces';

const Context = React.createContext<ErrorContext| null>(null);

export const ErrorContextProvider = Context.Provider;

export const useErrorContext = (): ErrorContext => {
    const ctx = React.useContext(Context);

    if (ctx === null) {
        throw new Error('useErrorContext must be used within ErrorContextProvider');
    }

    return ctx;
};
