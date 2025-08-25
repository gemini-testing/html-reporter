import {createContext, useContext, useCallback, useState} from 'react';
import {InteractiveFitMode} from '../TwoUpInteractiveMode/constants';

export interface ViewportState {
    scale: number;
    translateX: number;
    translateY: number;
}

export interface ViewportContextValue {
    viewport: ViewportState;
    updateViewport: (newViewport: Partial<ViewportState> | ((current: ViewportState) => Partial<ViewportState>)) => void;
    fitMode: InteractiveFitMode;
    setFitMode: (mode: InteractiveFitMode) => void;
}

const initialViewport: ViewportState = {
    scale: 1,
    translateX: 0,
    translateY: 0
};

export const ViewportContext = createContext<ViewportContextValue | null>(null);

export function useSyncedViewport(customInitialViewport?: ViewportState): ViewportContextValue {
    const [viewport, setViewport] = useState<ViewportState>(customInitialViewport || initialViewport);
    const [fitMode, setFitMode] = useState<InteractiveFitMode>(InteractiveFitMode.FitWidth);

    const updateViewport = useCallback((newViewport: Partial<ViewportState> | ((current: ViewportState) => Partial<ViewportState>)) => {
        setViewport(current => {
            const updates = typeof newViewport === 'function' ? newViewport(current) : newViewport;
            return {
                ...current,
                ...updates
            };
        });
    }, []);

    return {
        viewport,
        updateViewport,
        fitMode,
        setFitMode
    };
}

export function useViewportContext(): ViewportContextValue {
    const context = useContext(ViewportContext);
    if (!context) {
        throw new Error('useViewportContext must be used within ViewportContext.Provider');
    }
    return context;
}
