declare module 'gemini-configparser' {
    const root: (
        rootParser: any,
        obj: {envPrefix: string,
            cliPrefix: string}
        ) =>  (obj: {options: any, env: any, argv: string[]}) => any;
    const section: (properties: any) => (locator: any, config: any) => () => any;
    const option: any;
}
