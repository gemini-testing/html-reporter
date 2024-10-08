export interface Feature {
    name: string;
}

export const RunTestsFeature = {
    name: 'run-tests'
} as const satisfies Feature;

export const EditScreensFeature = {
    name: 'edit-screens'
} as const satisfies Feature;
