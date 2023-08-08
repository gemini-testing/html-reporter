export interface Suite {
    readonly root: boolean;
    readonly title: string;
    parent: Suite | null;
}
