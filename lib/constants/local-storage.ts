export enum LocalStorageKey {
    UIMode = 'ui-mode'
}

export const getTimeTravelFeatureLocalStorageKey = (toolName: string): string => `time-travel-${toolName}`;

export enum UiMode {
    Old = 'old',
    New = 'new',
}
