import React, {createContext, useContext, useState, useCallback, ReactNode, useEffect} from 'react';

interface FocusedImageContextValue {
    focusedImageId: string | null;
    setFocusedImageId: (id: string | null) => void;
    imageIds: string[];
    registerImageId: (id: string) => void;
    unregisterImageId: (id: string) => void;
}

const FocusedImageContext = createContext<FocusedImageContextValue | null>(null);

interface FocusedImageProviderProps {
    children: ReactNode;
}

export function FocusedImageProvider({children}: FocusedImageProviderProps): ReactNode {
    const [focusedImageId, setFocusedImageId] = useState<string | null>(null);
    const [imageIds, setImageIds] = useState<string[]>([]);

    const registerImageId = useCallback((id: string) => {
        setImageIds(prev => {
            if (prev.includes(id)) {
                return prev;
            }
            return [...prev, id];
        });
    }, []);

    const unregisterImageId = useCallback((id: string) => {
        setImageIds(prev => prev.filter(imageId => imageId !== id));
    }, []);

    useEffect(() => {
        if (imageIds.length > 0 && (focusedImageId === null || !imageIds.includes(focusedImageId))) {
            setFocusedImageId(imageIds[0]);
        }
    }, [imageIds, focusedImageId]);

    return (
        <FocusedImageContext.Provider value={{
            focusedImageId,
            setFocusedImageId,
            imageIds,
            registerImageId,
            unregisterImageId
        }}>
            {children}
        </FocusedImageContext.Provider>
    );
}

export function useFocusedImage(): FocusedImageContextValue {
    const context = useContext(FocusedImageContext);
    if (!context) {
        throw new Error('useFocusedImage must be used within a FocusedImageProvider');
    }
    return context;
}
