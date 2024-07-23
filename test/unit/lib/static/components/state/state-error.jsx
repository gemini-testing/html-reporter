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

            assert.equal(component.find('.error__item').at(0).text(), 'message: some-msg');
            assert.equal(component.find('.error__item').at(1).text(), 'stack: some-stack');
        });

        it('should break error fields by line break', () => {
            const error = {message: 'msg-title\nmsg-content'};

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns: []}});
            component.find('.details__summary').first().simulate('click');

            assert.equal(component.find('.details__summary').first().text(), 'message: msg-title');
            assert.equal(component.find('.details__content').first().text(), 'msg-content');
        });

        it(`should not break error fields if theirs length is less than ${ERROR_TITLE_TEXT_LENGTH} charachters`, () => {
            const error = {message: Array(ERROR_TITLE_TEXT_LENGTH - 1).join('a')};

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns: []}});

            assert.equal(component.find('.error__item').first().text(), `message: ${error.message}`);
        });

        it(`should break error fields by spaces if theirs length more than ${ERROR_TITLE_TEXT_LENGTH} characters`, () => {
            const messageTitle = Array(ERROR_TITLE_TEXT_LENGTH - 50).join('a');
            const messageContent = Array(ERROR_TITLE_TEXT_LENGTH).join('b');
            const error = {message: `${messageTitle} ${messageContent}`};

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns: []}});
            component.find('.details__summary').first().simulate('click');

            assert.equal(component.find('.details__summary').first().text(), `message: ${messageTitle}`);
            assert.equal(component.find('.details__content').first().text(), messageContent);
        });
    });

    describe('"errorPatterns" is specified', () => {
        it('should render error "message" with starting "name" of "errorPattern" prop', () => {
            const error = {message: 'some-msg'};
            const errorPatterns = [{name: 'some-name'}];

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns}});
            component.find('.details__summary').first().simulate('click');

            assert.equal(component.find('.details__summary').first().text(), 'message: some-name');
            assert.equal(component.find('.details__content').first().text(), 'some-msg');
        });

        it('should render "hint" as html string', () => {
            const error = {message: 'some-msg'};
            const errorPatterns = [{name: 'some-name', hint: '<span class="foo-bar">some-hint</span>'}];

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns}});
            component.find('.details__summary').last().simulate('click');

            assert.equal(component.find('.details__summary').at(1).text(), 'hint: show more');
            assert.equal(component.find('.details__content .foo-bar').text(), ['some-hint']);
        });
    });

    describe('error snippet', () => {
        it('should be rendered in div tags', () => {
            const error = {snippet: `\x1B[90m   . | // /some-file-path.js\x1B[39m")}
                . |
                9 | some line
               10 | other line
            `};

            const component = mkStateErrorComponent({result: {error}});
            component.find('.details__summary').last().simulate('click');

            assert.isTrue(component.find('.details__content').html().startsWith('<div class="details__content"><div>'));
            assert.isTrue(component.find('.details__content').html().includes('some line'));
            assert.isTrue(component.find('.details__content').html().endsWith('</div></div>'));
        });

        it('should resolve colors', () => {
            const error = {snippet: `\x1B[90m   . | // /some-file-path.js\x1B[39m)}
                . |
                9 | some line
               10 | other line
            `};

            const component = mkStateErrorComponent({result: {error}});
            component.find('.details__summary').last().simulate('click');

            const expectedSpan = '<span style="color:#888;">   . | // /some-file-path.js</span>';
            assert.isTrue(component.find('.details__content').html().includes(expectedSpan));
        });

        it('should escape html', () => {
            const error = {snippet: `\x1B[90m   . | // /some-file-path.js\x1B[39m")}
                . |
                9 | some<line>
               10 | other line
            `};

            const component = mkStateErrorComponent({result: {error}});
            component.find('.details__summary').last().simulate('click');

            assert.isFalse(component.find('.details__content').html().includes('some<line>'));
            assert.isTrue(component.find('.details__content').html().includes('some&lt;line&gt;'));
        });
    });
});
