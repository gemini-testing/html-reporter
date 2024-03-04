import {CoordBounds} from 'looks-same';
import {DiffOptions, ImageFile} from '../types';
import {ValueOf} from 'type-fest';

export const ErrorName = {
    GENERAL_ERROR: 'Error',
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
    currImg: ImageFile;
    refImg: ImageFile;
    diffClusters: CoordBounds[];
    diffBuffer?: ArrayBuffer;
    diffImg?: ImageFile;
    differentPixels?: number; // defined if hermione >= 8.2.0
    diffRatio?: number; // defined if hermione >= 8.2.0
}

export interface NoRefImageError {
    name: ErrorNames['NO_REF_IMAGE'];
    stateName: string;
    message: string;
    stack?: string;
    currImg: ImageFile;
    refImg: ImageFile;
}
