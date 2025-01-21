import {Boundary} from './Boundary';
import {FallbackAppCrash, FallbackCardCrash, FallbackDataCorruption} from './fallbacks';

export const ErrorHandler = {
    Root: Boundary,
    FallbackAppCrash,
    FallbackCardCrash,
    FallbackDataCorruption
};
