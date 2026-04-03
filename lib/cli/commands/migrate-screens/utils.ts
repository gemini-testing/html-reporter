import path from 'node:path';
import url from 'node:url';
import fs from 'fs-extra';

import {isUrl} from '../../../common-utils';
import {getShortMD5} from '../../../common-utils';
import {getTempPath} from '../../../server-utils';
import {fetchFile} from '../../../common-utils';
import {makeDirFor} from '../../../server-utils';
import {TimingStats, RefPathMap} from './types';
import {ImageInfoFull, RefImageFile} from '../../../types';

const remoteImageCache = new Map<string, string>();

export const downloadImageIfNeeded = async (
    reportPath: string,
    imagePath: string,
    stats: TimingStats
): Promise<string> => {
    if (isUrl(imagePath)) {
        if (remoteImageCache.has(imagePath)) {
            return remoteImageCache.get(imagePath) as string;
        }

        const downloadStartedAt = Date.now();
        const extension = path.extname(url.parse(imagePath).pathname ?? '') || '.png';
        const downloadFileName = `${getShortMD5(imagePath)}${extension}`;
        const tempPath = await getTempPath(path.join('remote-images', downloadFileName));

        const {data} = await fetchFile<ArrayBuffer>(imagePath, {responseType: 'arraybuffer'}, true);
        if (!data) {
            return '';
        }

        await makeDirFor(tempPath);
        await fs.writeFile(tempPath, Buffer.from(data));

        remoteImageCache.set(imagePath, tempPath);
        stats.downloadMs += Date.now() - downloadStartedAt;
        stats.downloads += 1;

        return tempPath;
    }

    return path.isAbsolute(imagePath) ? imagePath : path.resolve(reportPath, imagePath);
};

const normalizeRefPathMap = (maps: RefPathMap[], cwd: string): RefPathMap[] => {
    return maps.map(({from, to}) => ({
        from,
        to: to === '.' ? cwd : to
    }));
};

const resolveRefPath = async (
    refPath: string,
    maps: RefPathMap[],
    cwd: string
): Promise<string | null> => {
    if (await fs.pathExists(refPath)) {
        return refPath;
    }

    for (const map of normalizeRefPathMap(maps, cwd)) {
        if (refPath.startsWith(map.from)) {
            const suffix = refPath.slice(map.from.length).replace(/^[\\/]+/, '');
            const mapped = path.resolve(map.to, suffix);
            if (await fs.pathExists(mapped)) {
                return mapped;
            }
        }
    }

    const cwdName = path.basename(cwd);
    if (cwdName) {
        const normalized = refPath.replace(/\\/g, '/');
        const marker = `/${cwdName}/`;
        if (normalized.includes(marker)) {
            const suffix = normalized.split(marker)[1];
            const mapped = path.resolve(cwd, suffix);
            if (await fs.pathExists(mapped)) {
                return mapped;
            }
        } else if (normalized.endsWith(`/${cwdName}`)) {
            if (await fs.pathExists(cwd)) {
                return cwd;
            }
        }
    }

    return null;
};

export const downloadAndResolveImagePaths = async (
    imagesInfo: ImageInfoFull[],
    reportPath: string,
    stats: TimingStats,
    refPathMaps: RefPathMap[],
    cwd: string
): Promise<ImageInfoFull[]> => {
    return Promise.all(imagesInfo.map(async (imageInfo) => {
        const updated = {...imageInfo} as ImageInfoFull;

        if ('actualImg' in updated && updated.actualImg && 'path' in updated.actualImg) {
            const resolvedActual = await downloadImageIfNeeded(reportPath, updated.actualImg.path, stats);
            if (resolvedActual) {
                updated.actualImg = {...updated.actualImg, path: resolvedActual};
            }
        }

        if ('expectedImg' in updated && updated.expectedImg && 'path' in updated.expectedImg) {
            const resolvedExpected = await downloadImageIfNeeded(reportPath, updated.expectedImg.path, stats);
            if (resolvedExpected) {
                updated.expectedImg = {...updated.expectedImg, path: resolvedExpected};
            }
        }

        if ('diffImg' in updated && updated.diffImg && 'path' in updated.diffImg) {
            const resolvedDiff = await downloadImageIfNeeded(reportPath, updated.diffImg.path, stats);
            if (resolvedDiff) {
                updated.diffImg = {...updated.diffImg, path: resolvedDiff};
            }
        }

        if ('refImg' in updated && updated.refImg && 'path' in updated.refImg) {
            const resolvedRef = await resolveRefPath(updated.refImg.path, refPathMaps, cwd);
            if (!resolvedRef) {
                throw new Error(
                    `Failed to resolve reference image path from db:\n  ${updated.refImg.path}\n` +
                    'Use --ref-path-map <from>=<to>.\n' +
                    'Example: --ref-path-map /path/to/your/project=.\n' +
                    'This maps the stored path prefix to the current working directory.'
                );
            }
            updated.refImg = {...updated.refImg, path: resolvedRef} as RefImageFile;
        }

        return updated;
    }));
};
