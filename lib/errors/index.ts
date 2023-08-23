import {CoordBounds} from 'looks-same';
import {DiffOptions, ImageData} from '../types';

export enum ErrorName {
    IMAGE_DIFF = 'ImageDiffError',
    NO_REF_IMAGE = 'NoRefImageError'
}

export interface ImageDiffError {
    name: ErrorName.IMAGE_DIFF;
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
    name: ErrorName.NO_REF_IMAGE;
    stateName: string;
    message: string;
    stack: string;
    currImg: ImageData;
    refImg: ImageData;
}
