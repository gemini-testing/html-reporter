import type {HotkeysGroup} from '@gravity-ui/navigation';

export const HOTKEYS_GROUPS: HotkeysGroup[] = [
    {
        title: 'Navigation',
        items: [
            {title: 'Suites page', value: 's'},
            {title: 'Visual Checks page', value: 'v'},
            {title: 'Keyboard shortcuts', value: 'mod+/'},
            {title: 'Info panel', value: 'i'},
            {title: 'Settings panel', value: ','}
        ]
    },
    {
        title: 'Tests Tree',
        items: [
            {title: 'Toggle tree sidebar', value: 't'},
            {title: 'Focus search', value: 'mod+k'},
            {title: 'Clear search', value: 'escape'}
        ]
    },
    {
        title: 'Working with Tests',
        items: [
            {title: 'Previous test', value: '↑'},
            {title: 'Next test', value: '↓'},
            {title: 'Previous attempt', value: '←'},
            {title: 'Next attempt', value: '→'},
            {title: 'Run current test', value: 'r'},
            {title: 'Run all/selected tests', value: 'shift+r'},
            {title: 'Accept screenshot', value: 'a'},
            {title: 'Undo accept', value: 'u'},
            {title: 'Accept all/selected', value: 'shift+a'},
            {title: 'Go to Suites / Visual Checks', value: 'g'}
        ]
    },
    {
        title: 'Time Travel Player',
        items: [
            {title: 'Show/hide player', value: 'p'},
            {title: 'Play/pause', value: 'k'}
        ]
    }
];

