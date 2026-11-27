declare module '*.png' {
    const value: string;
    export default value;
}

declare const describe: import('testplane').SuiteDefinition;
declare const it: import('testplane').TestDefinition;
declare const beforeEach: import('testplane').TestHookDefinition;
