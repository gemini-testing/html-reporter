import type {ValueOf} from 'type-fest';

export const DiffModes = {
    THREE_UP: {
        id: '3-up',
        title: 'List',
        description: 'List. Show images one after another in vertical layout.'
    },
    THREE_UP_SCALED: {
        id: '3-up-scaled',
        title: 'SbS',
        description: 'Side by Side. Show images in one row.'
    },
    THREE_UP_SCALED_TO_FIT: {
        id: '3-up-scaled-to-fit',
        title: 'SbS (fit screen)',
        description: 'Side by Side. Show images in one row and scale them down if needed to fit the screen.'
    },
    ONLY_DIFF: {
        id: 'only-diff',
        title: 'Only Diff',
        description: 'Only Diff. Show only diff image, click to highlight diff areas.'
    },
    SWITCH: {
        id: 'switch',
        title: 'Switch',
        description: 'Switch. Click to switch between expected and actual images.'
    },
    SWIPE: {
        id: 'swipe',
        title: 'Swipe',
        description: 'Swipe. Move the divider to compare expected and actual images.'
    },
    ONION_SKIN: {
        id: 'onion-skin',
        title: 'Onion skin',
        description: 'Onion Skin. Change the image opacity to compare expected and actual images.'
    },
    TWO_UP_INTERACTIVE: {
        id: '2-up-interactive',
        title: '2-up Interactive',
        description: '2-up Interactive. Compare expected and actual images side by side with synchronized pan and zoom.'
    }
} as const;

export type DiffModes = typeof DiffModes;

export type DiffMode = ValueOf<DiffModes>;

export type DiffModeId = DiffModes[keyof DiffModes]['id'];
