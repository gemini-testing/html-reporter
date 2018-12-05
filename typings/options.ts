export interface IOptions {
    enabled?: boolean;
    browserId?: string;
    baseHost?: string;
    forBrowser?(path: string): { getAbsoluteUrl(path: string): string };
}
