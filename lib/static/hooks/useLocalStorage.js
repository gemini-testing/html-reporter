import {useCallback, useEffect, useState} from 'react';
import useEventListener from './useEventListener';
import * as localStorageWrapper from '../modules/local-storage-wrapper';

/**
 * @param key
 * @param initialValue
 * @returns {[*, function]} An array containing the current state value and a function to update it.
 */
export default function useLocalStorage(key, initialValue) {
    const readValue = useCallback(() => {
        return localStorageWrapper.getItem(key, initialValue);
    }, [key, initialValue]);

    const [storedValue, setStoredValue] = useState(readValue);

    const writeValue = useCallback(newValue => {
        const customEvent = Object.assign(new Event('local-storage'), {key});
        const settingValue = newValue instanceof Function
            ? newValue(storedValue)
            : newValue;

        localStorageWrapper.setItem(key, settingValue);

        setStoredValue(settingValue);

        window.dispatchEvent(customEvent);
    }, []);

    useEffect(() => {
        setStoredValue(readValue());
    }, []);

    const handleStorageChange = useCallback((event) => {
        if (event && event.key === key) {
            setStoredValue(readValue());
        }
    }, [key, readValue]);

    useEventListener('storage', handleStorageChange);
    useEventListener('local-storage', handleStorageChange);

    return [storedValue, writeValue];
}
