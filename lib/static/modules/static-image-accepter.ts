import PropTypes from 'prop-types';
import {get} from 'lodash';
import type {ReporterConfig} from '../../types';
import {COMMITED, STAGED} from '../../constants';
import * as localStorage from './local-storage-wrapper';
import {ImageEntity, ImageEntityFail} from '@/static/new-ui/types/store';

let isEnabled: boolean | null = null;

export interface AcceptableImage {
    id: string;
    parentId: string;
    stateName: string;
    stateNameImageId: string;
    commitStatus: null | typeof STAGED | typeof COMMITED;
    originalStatus: string;
}

type ImagesById = Record<string, ImageEntity>;

interface LocalStorageValue {
    date: string,
    pathName: string,
    commitedImages: Record<string, string>
    }

type CommitPayload = Array<{
    id: string;
    stateNameImageId: string;
    image: string;
    path: string;
}>

const STATIC_ACCEPTER_LOCAL_STORAGE_KEY = 'static-image-accepter';

export const checkIsEnabled = (config: ReporterConfig['staticImageAccepter'], isGui: boolean): boolean => {
    if (isEnabled !== null) {
        return isEnabled;
    }

    if (!config || !config.enabled || isGui) {
        return isEnabled = false;
    }

    const requiredConfigFields: Array<keyof ReporterConfig['staticImageAccepter']> = ['repositoryUrl', 'pullRequestUrl', 'serviceUrl'];
    const missingFields = (requiredConfigFields).filter(key => !config[key]);

    if (missingFields.length) {
        console.error(`staticImageAccepter is disabled. Invalid config: '${missingFields.join(', ')}' is(/are) missing!`);
        return isEnabled = false;
    }

    return isEnabled = true;
};

export const formatCommitPayload = (
    acceptableImgages: AcceptableImage[],
    imagesById: ImagesById,
    extraImages: Array<{imageId: string, stateNameImageId: string}> = []
): CommitPayload => {
    const imagesToCommit = acceptableImgages
        .filter(image => image.commitStatus === STAGED)
        .map(image => ({imageId: image.id, stateNameImageId: image.stateNameImageId}))
        .concat(extraImages);

    if (imagesToCommit.find(({imageId}) => !imagesById[imageId].refImg?.relativePath)) {
        throw new Error(`The version of your tool does not support static image accepter: missing "relativePath"`);
    }

    return imagesToCommit.map(({imageId, stateNameImageId}) => ({
        id: imageId,
        stateNameImageId,
        image: (imagesById[imageId] as ImageEntityFail).actualImg.path,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        path: (imagesById[imageId] as ImageEntityFail).refImg.relativePath!
    }));
};

const getLocalStorageCommitedImages = (): Record<string, string> => {
    const date = get(window, ['data', 'date']);
    const pathName = get(window, ['location', 'pathname']);

    const value = localStorage.getItem(STATIC_ACCEPTER_LOCAL_STORAGE_KEY, null) as LocalStorageValue;

    if (!value || value.date !== date || value.pathName !== pathName) {
        return {};
    }

    return value.commitedImages;
};

export const getLocalStorageCommitedImageIds = (): string[] => Object.values(getLocalStorageCommitedImages());

export const storeCommitInLocalStorage = (newCommitedImages: Array<{imageId: string, stateNameImageId: string}>): void => {
    const date = get(window, ['data', 'date']);
    const pathName = get(window, ['location', 'pathname']);

    const currentState = getLocalStorageCommitedImages();
    const update = newCommitedImages.reduce((acc, {imageId, stateNameImageId}) => {
        acc[stateNameImageId] = imageId;

        return acc;
    }, {} as Record<string, string>);

    localStorage.setItem(STATIC_ACCEPTER_LOCAL_STORAGE_KEY, {
        date,
        pathName,
        commitedImages: {...currentState, ...update}
    } as LocalStorageValue);
};

export const staticImageAccepterPropType = PropTypes.shape({
    enabled: PropTypes.bool.isRequired,
    accepterDelayedImages: PropTypes.arrayOf(PropTypes.shape({
        imageId: PropTypes.string.isRequired,
        stateName: PropTypes.string.isRequired,
        stateNameImageId: PropTypes.string.isRequired
    })).isRequired,
    acceptableImages: PropTypes.objectOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        parentId: PropTypes.string.isRequired,
        stateName: PropTypes.string.isRequired,
        commitStatus: PropTypes.oneOf([null, STAGED, COMMITED]),
        originalStatus: PropTypes.string.isRequired
    }))
});
