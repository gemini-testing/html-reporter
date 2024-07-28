import userEvent from '@testing-library/user-event';
import {expect} from 'chai';
import React from 'react';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {ERROR_TITLE_TEXT_LENGTH} from 'lib/constants/errors';
import {mkConnectedComponent} from '../utils';

describe('<StateError/> component', () => {
    const sandbox = sinon.sandbox.create();
    let StateError, ResizedScreenshot, actionsStub;

    const mkStateErrorComponent = (props = {}, initialState = {}) => {
        props = defaults(props, {
            result: {
                error: {message: 'default-message', stack: 'default-stack'}
            },
            image: {stateName: 'some-name'}
        });

        initialState = defaults(initialState, {
            config: {errorPatterns: []}
        });

        return mkConnectedComponent(<StateError {...props} />, {initialState});
    };

    beforeEach(() => {
        ResizedScreenshot = sinon.stub().returns(null);
        actionsStub = {
            togglePageScreenshot: sandbox.stub().returns({type: 'some-type'})
        };

        StateError = proxyquire('lib/static/components/state/state-error', {
            './screenshot/resized': {default: ResizedScreenshot},
            '../../modules/actions': actionsStub
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('"errorPatterns" is not specified', () => {
        it('should render error "message" and "stack" if "errorPatterns" is empty', () => {
            const error = {message: 'some-msg', stack: 'some-stack'};

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns: []}});

            expect(component.getByText('some-msg')).to.exist;
            expect(component.getByText('some-stack')).to.exist;
        });

        it('should break error fields by line break', async () => {
            const user = userEvent.setup();
            const error = {message: 'msg-title\nmsg-content'};

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns: []}});
            await user.click(component.getByText('message', {exact: false}));

            expect(component.getByText('msg-title', {selector: '.details__summary'})).to.exist;
            expect(component.getByText('msg-content', {selector: '.details__content>*'})).to.exist;
        });

        it(`should not break error fields if theirs length is less than ${ERROR_TITLE_TEXT_LENGTH} characters`, () => {
            const error = {message: Array(ERROR_TITLE_TEXT_LENGTH - 1).join('a')};

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns: []}});

            expect(component.getByText(error.message, {selector: '.error__item'})).to.exist;
        });

        it(`should break error fields by spaces if theirs length more than ${ERROR_TITLE_TEXT_LENGTH} characters`, async () => {
            const user = userEvent.setup();
            const messageTitle = Array(ERROR_TITLE_TEXT_LENGTH - 50).join('a');
            const messageContent = Array(ERROR_TITLE_TEXT_LENGTH).join('b');
            const error = {message: `${messageTitle} ${messageContent}`};

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns: []}});
            await user.click(component.getByText('message', {exact: false}));

            expect(component.getByText(messageTitle, {selector: '.details__summary'})).to.exist;
            expect(component.getByText(messageContent, {selector: '.details__content>*'})).to.exist;
        });
    });

    describe('"errorPatterns" is specified', () => {
        it('should render error "message" with starting "name" of "errorPattern" prop', async () => {
            const user = userEvent.setup();
            const error = {message: 'some-msg'};
            const errorPatterns = [{name: 'some-name'}];

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns}});
            await user.click(component.getByText('message', {exact: false}));

            expect(component.getByText('some-name', {selector: '.details__summary'})).to.exist;
            expect(component.getByText('some-msg', {selector: '.details__content>*'})).to.exist;
        });

        it('should render "hint" as html string', async () => {
            const user = userEvent.setup();
            const error = {message: 'some-msg'};
            const errorPatterns = [{name: 'some-name', hint: '<span class="foo-bar">some-hint</span>'}];

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns}});
            await user.click(component.getByText('hint', {exact: false}));

            expect(component.getByText('show more')).to.exist;
            expect(component.getByText('some-hint')).to.exist;
        });
    });

    describe('error snippet', () => {
        it('should be rendered in div tags', async () => {
            const user = userEvent.setup();
            const error = {snippet: `\x1B[90m   . | // /some-file-path.js\x1B[39m")}
                . |
                9 | some line
               10 | other line
            `};

            const component = mkStateErrorComponent({result: {error}});
            await user.click(component.getByText('stack', {exact: false}));
            const errorStackHtml = component.container.querySelector('.details__content').parentNode.innerHTML;

            assert.isTrue(errorStackHtml.startsWith('<div class="details__content"><div>'));
            assert.isTrue(errorStackHtml.includes('some line'));
            assert.isTrue(errorStackHtml.endsWith('</div></div>'));
        });

        it('should resolve colors', async () => {
            const user = userEvent.setup();
            const error = {snippet: `\x1B[90m   . | // /some-file-path.js\x1B[39m)}
                . |
                9 | some line
               10 | other line
            `};

            const component = mkStateErrorComponent({result: {error}});
            await user.click(component.getByText('stack', {exact: false}));
            const errorStackHtml = component.container.querySelector('.details__content').parentNode.innerHTML;

            const expectedSpan = '<span style="color:#888;">   . | // /some-file-path.js</span>';
            assert.isTrue(errorStackHtml.includes(expectedSpan));
        });

        it('should escape html', async () => {
            const user = userEvent.setup();
            const error = {snippet: `\x1B[90m   . | // /some-file-path.js\x1B[39m")}
                . |
                9 | some<line>
               10 | other line
            `};

            const component = mkStateErrorComponent({result: {error}});
            await user.click(component.getByText('stack', {exact: false}));
            const errorStackHtml = component.container.querySelector('.details__content').parentNode.innerHTML;

            assert.isFalse(errorStackHtml.includes('some<line>'));
            assert.isTrue(errorStackHtml.includes('some&lt;line&gt;'));
        });
    });
});
