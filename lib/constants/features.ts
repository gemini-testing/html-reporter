export interface Feature {
    name: string;
}

export const RunTestsFeature = {
    name: 'run-tests'
} as const satisfies Feature;
