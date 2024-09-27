declare module '*.svg' {
    const value: string;
    export = value;
}

declare module '*.module.css' {
    const classes: {[key: string]: string};
    export default classes;
}

declare module 'ansi-html-community' {
    interface AnsiHtmlCommunity {
        (value: string): string;
        setColors: (colors: Record<string, unknown>) => void;
    }
    const f: AnsiHtmlCommunity;

    export default f;
}
