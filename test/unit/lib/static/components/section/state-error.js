import React from 'react';
import StateError from 'lib/static/components/state/state-error';
import {ERROR_TITLE_TEXT_LENGTH} from 'lib/constants/errors';

describe('<StateError/> component', () => {
    const mkStateErrorComponent = (props = {}) => {
        props = {
            image: false,
            error: {message: 'default-message', stack: 'default-stack'},
            actualImg: {},
            errorPattern: null,
            ...props
        };

        return mount(<StateError {...props} />);
    };

    describe('"errorPattern" prop is not passed', () => {
        it('should render error "message", "stack" and "history" if "errorPattern" prop is not passed', () => {
            const error = {message: 'some-msg', stack: 'some-stack', history: 'some-history'};

            const component = mkStateErrorComponent({error});

            assert.equal(component.find('.error__item').at(0).text(), 'message: some-msg');
            assert.equal(component.find('.error__item').at(1).text(), 'stack: some-stack');
            assert.equal(component.find('.error__item').at(2).text(), 'history: some-history');
        });

        it('should break error fields by line break', () => {
            const error = {message: 'msg-title\nmsg-content'};

            const component = mkStateErrorComponent({error});

            assert.equal(component.find('.details__summary').first().text(), 'message: msg-title');
            assert.equal(component.find('.details__content').first().text(), 'msg-content');
        });

        it(`should not break error fields if theirs length is less than ${ERROR_TITLE_TEXT_LENGTH} charachters`, () => {
            const error = {message: Array(ERROR_TITLE_TEXT_LENGTH - 1).join('a')};

            const component = mkStateErrorComponent({error});

            assert.equal(component.find('.error__item').first().text(), `message: ${error.message}`);
        });

        it(`should break error fields by spaces if theirs length more than ${ERROR_TITLE_TEXT_LENGTH} characters`, () => {
            const messageTitle = Array(ERROR_TITLE_TEXT_LENGTH - 50).join('a');
            const messageContent = Array(ERROR_TITLE_TEXT_LENGTH).join('b');
            const error = {message: `${messageTitle} ${messageContent}`};

            const component = mkStateErrorComponent({error});

            assert.equal(component.find('.details__summary').first().text(), `message: ${messageTitle}`);
            assert.equal(component.find('.details__content').first().text(), messageContent);
        });
    });

    describe('"errorPattern" prop is passed', () => {
        it('should render error "message" with starting "name" of "errorPattern" prop', () => {
            const error = {message: 'some-msg'};
            const errorPattern = {name: 'some-name'};

            const component = mkStateErrorComponent({error, errorPattern});

            assert.equal(component.find('.details__summary').first().text(), 'message: some-name');
            assert.equal(component.find('.details__content').first().text(), 'some-msg');
        });

        it('should render "hint" as plain string', () => {
            const error = {message: 'some-msg'};
            const errorPattern = {name: 'some-name', hint: 'some-hint'};

            const component = mkStateErrorComponent({error, errorPattern});

            assert.equal(component.find('.error__item').last().text(), 'hint: some-hint');
        });

        it('should render "hint" as html string', () => {
            const error = {message: 'some-msg'};
            const errorPattern = {name: 'some-name', hint: '<span class="foo-bar">some-hint</span>'};

            const component = mkStateErrorComponent({error, errorPattern});

            assert.equal(component.find('.details__summary').last().text(), 'hint: show more');
            assert.equal(component.find('.details__content .foo-bar').text(), ['some-hint']);
        });
    });
});
