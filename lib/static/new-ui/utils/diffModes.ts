import {DiffMode, DiffModes} from '@/constants';
import {Page} from '@/constants';

export function getAvailableDiffModes(page: Page): DiffMode[] {
    const allModes = Object.values(DiffModes);

    if (page === Page.visualChecksPage) {
        return allModes;
    }

    return allModes.filter(mode => mode.id !== DiffModes.TWO_UP_INTERACTIVE.id);
}
