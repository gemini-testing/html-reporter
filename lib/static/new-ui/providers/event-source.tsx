import React, {createContext, ReactNode, useContext, useEffect, useState} from 'react';

const EventSourceContext = createContext<EventSource | null>(null);

interface EventSourceProviderProps {
    children: ReactNode;
}

export const EventSourceProvider = ({children}: EventSourceProviderProps): ReactNode => {
    const [eventSource, setEventSource] = useState<EventSource | null>(null);

    useEffect(() => {
        const es = new EventSource('/events');
        setEventSource(es);

        return () => {
            es.close();
        };
    }, []);

    return (
        <EventSourceContext.Provider value={eventSource}>
            {children}
        </EventSourceContext.Provider>
    );
};

export const useEventSource = (): EventSource | null => {
    return useContext(EventSourceContext);
};
