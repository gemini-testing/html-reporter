import {Boundary} from './Boundary';
import {AppCrash, CardCrash, DataCorruption} from './fallbacks';

export const ErrorHandler = {
    Root: Boundary,
    AppCrash,
    CardCrash,
    DataCorruption
};
