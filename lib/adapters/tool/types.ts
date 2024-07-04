export interface TestSpec {
    testName: string;
    browserName: string;
}

export interface CustomGuiActionPayload {
    sectionName: string;
    groupIndex: number;
    controlIndex: number;
}
