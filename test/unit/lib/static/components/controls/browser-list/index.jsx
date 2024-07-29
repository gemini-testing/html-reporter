import {expect} from 'chai';
import React from 'react';
import BrowserList from '../../../../../../../lib/static/components/controls/browser-list';
import {ThemeProvider} from '@gravity-ui/uikit';
import {render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('<BrowserList />', () => {
    const sandbox = sinon.sandbox.create();
    let mutationObserverOriginal;

    beforeEach(() => {
        mutationObserverOriginal = global.MutationObserver;
        global.MutationObserver = class {
            constructor() {}
            disconnect() {}
            observe() {}
        };
    });

    afterEach(() => {
        sandbox.restore();
        global.MutationObserver = mutationObserverOriginal;
    });

    it('should not contain selected items', async () => {
        const user = userEvent.setup();
        const props = {
            available: [
                {id: 'bro1'},
                {id: 'bro2'}
            ]
        };
        const component = render(<ThemeProvider theme='light'><BrowserList {...props} /></ThemeProvider>);

        await user.click(component.getByRole('combobox'));

        expect(component.container.querySelector('.g-list__items .g-list__item_selected')).to.not.exist;
    });

    it('should contain selected items', async () => {
        const props = {
            available: [
                {id: 'bro1', versions: ['unknown']},
                {id: 'bro2', versions: ['unknown']},
                {id: 'bro3', versions: ['unknown']}
            ],
            selected: [
                {id: 'bro2', versions: ['unknown']},
                {id: 'bro3', versions: ['unknown']}
            ]
        };
        const component = render(<ThemeProvider theme='light'><BrowserList {...props} /></ThemeProvider>);

        expect(component.getByRole('combobox').textContent).to.equal('bro2, bro3');
        expect(component.getByText('2', {selector: 'span'})).to.exist;
    });

    it('should create groups for versions', async () => {
        const user = userEvent.setup();
        const props = {
            available: [
                {id: 'bro1', versions: ['v1', 'v2', 'v3']}
            ],
            selected: [
                {id: 'bro1', versions: ['v1', 'v2']}
            ],
            onChange: () => {}
        };

        const component = render(<ThemeProvider theme='light'><BrowserList {...props} /></ThemeProvider>);

        await user.click(component.getByRole('combobox'));

        assert.equal(component.container.querySelector('.g-select-list__group-label-content').textContent, 'bro1');
    });

    it('should trigger "change" event with selected browsers and versions', async () => {
        const user = userEvent.setup();
        const props = {
            available: [
                {id: 'bro'},
                {id: 'bro1', versions: ['v1']},
                {id: 'bro2', versions: ['v1', 'v2', 'v3']}
            ],
            selected: [
                {id: 'bro'},
                {id: 'bro1', versions: ['v1']},
                {id: 'bro2', versions: ['v1', 'v2', 'v3']}
            ],
            onChange: sandbox.spy()
        };
        const component = render(<ThemeProvider theme='light'><BrowserList {...props} /></ThemeProvider>);

        await user.click(component.getByRole('combobox'));
        await user.click(component.getByText((_, el) => el.textContent.includes('v3'), {selector: '[role=option]'}));

        assert.equal(props.onChange.callCount, 2);
        assert.deepEqual(props.onChange.lastCall.lastArg, [
            {id: 'bro', versions: []},
            {id: 'bro1', versions: ['v1']},
            {id: 'bro2', versions: ['v1', 'v2']}
        ]);
    });
});
