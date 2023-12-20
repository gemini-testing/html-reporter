import looksSame from 'looks-same';
import {DiffOptions} from '../types';

export function saveDiffTo(diffOpts: DiffOptions, diffPath: string): Promise<null> {
    const {diffColor: highlightColor, ...otherOpts} = diffOpts;

    return looksSame.createDiff({diff: diffPath, highlightColor, ...otherOpts});
}
