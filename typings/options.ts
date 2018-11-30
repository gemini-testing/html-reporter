export interface IOptions {
    browserId?: string;
    baseHost?: string;
    forBrowser?(path: string): { getAbsoluteUrl(path: string): string };
}
