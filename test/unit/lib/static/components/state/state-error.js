import React from 'react';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {ERROR_TITLE_TEXT_LENGTH} from 'lib/constants/errors';
import {mkConnectedComponent} from '../utils';

describe('<StateError/> component', () => {
    const sandbox = sinon.sandbox.create();
    let StateError, Screenshot, actionsStub;

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
        Screenshot = sinon.stub().returns(null);
        actionsStub = {
            togglePageScreenshot: sandbox.stub().returns({type: 'some-type'})
        };

        StateError = proxyquire('lib/static/components/state/state-error', {
            './screenshot': {default: Screenshot},
            '../../modules/actions': actionsStub
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('"errorPatterns" is not specified', () => {
        it('should render error "message", "stack" and "history" if "errorPatterns" is empty', () => {
            const error = {message: 'some-msg', stack: 'some-stack', history: 'some-history'};

            const component = mkStateErrorComponent({result: {error}}, {config: {errorPatterns: []}});

            assert.equal(component.find('.error__item').at(0).text(), 'message: some-msg');
            assert.equal(component.find('.error__item').at(1).text(), 'stack: some-stack');
            assert.equal(component.find('.error__item').at(2).text(), 'history: some-history');
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

    describe('"togglePageScreenshot" action', () => {
        it('should call on click in "Page screenshot"', () => {
            const image = {actualImg: {}};

            const component = mkStateErrorComponent({result: {error: {}}, image});
            component.find('.details__summary').last().simulate('click');

            assert.calledOnceWith(actionsStub.togglePageScreenshot);
        });
    });
});
