declare module '*.svg' {
    const value: string;
    export = value;
}

declare module '*.module.css' {
    const classes: { [key: string]: string };
    export default classes;
}
