import looksSame from 'looks-same';
import type {ImageDiffError} from '../errors';

export function saveDiffTo(imageDiffError: ImageDiffError, diffPath: string): Promise<null> {
    const {diffColor: highlightColor, ...otherOpts} = imageDiffError.diffOpts;

    return looksSame.createDiff({diff: diffPath, highlightColor, ...otherOpts});
}
