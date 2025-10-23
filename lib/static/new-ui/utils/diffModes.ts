import {DiffMode, DiffModes} from '@/constants';

export function getAvailableDiffModes(context: 'visual-checks' | 'suites'): DiffMode[] {
    const allModes = Object.values(DiffModes);

    if (context === 'visual-checks') {
        return allModes;
    }

    return allModes.filter(mode => mode.id !== DiffModes.TWO_UP_INTERACTIVE.id);
}
