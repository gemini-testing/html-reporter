import { ISuite } from './suite-adapter';

export interface IData {
    [key: string]: any;
    suites: ISuite[];
}
