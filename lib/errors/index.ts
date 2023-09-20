import {CoordBounds} from 'looks-same';
import {DiffOptions, ImageData} from '../types';
import {ValueOf} from 'type-fest';

export const ErrorName = {
    IMAGE_DIFF: 'ImageDiffError',
    NO_REF_IMAGE: 'NoRefImageError',
    ASSERT_VIEW: 'AssertViewError'
} as const;
export type ErrorName = ValueOf<typeof ErrorName>;
export type ErrorNames = typeof ErrorName;

export interface ImageDiffError {
    name: ErrorNames['IMAGE_DIFF'];
    message: string;
    stack: string;
    stateName: string;
    diffOpts: DiffOptions;
    currImg: ImageData;
    refImg: ImageData;
    diffClusters: CoordBounds[];
    diffBuffer?: ArrayBuffer;
}

export interface NoRefImageError {
    name: ErrorNames['NO_REF_IMAGE'];
    stateName: string;
    message: string;
    stack: string;
    currImg: ImageData;
    refImg: ImageData;
}
