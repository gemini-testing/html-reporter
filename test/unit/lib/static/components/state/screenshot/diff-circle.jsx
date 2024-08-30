import {fireEvent} from '@testing-library/react';
import React from 'react';
import DiffCircle from 'lib/static/components/state/screenshot/diff-circle';
import {mkConnectedComponent} from '../../../utils';

describe('DiffCircle component', () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => sandbox.restore());

    it('should set "debounce" option', () => {
        const stateComponent = mkConnectedComponent(
            <DiffCircle
                originalImageWidth = {10}
                diffTarget = {{offsetWidth: 10, getBoundingClientRect: () => ({left: 10, top: 10})}}
                diffBounds = {{left: 5, top: 5, right: 5, bottom: 5}}
                display = {true}
                toggleDiff = {() => {}}
            />
        );

        const {width, height, top, left} = stateComponent.container.querySelector('.diff-circle').style;

        assert.deepEqual({width, height, top, left}, {width: '1px', height: '1px', top: '15px', left: '15px'});
    });

    it('should toggle diff when animation is ended', () => {
        const toggleDiff = sandbox.stub();
        const stateComponent = mkConnectedComponent(
            <DiffCircle
                originalImageWidth = {10}
                diffTarget = {{offsetWidth: 30, getBoundingClientRect: () => ({left: 10, top: 10})}}
                diffBounds = {{left: 5, top: 5, right: 5, bottom: 5}}
                display = {true}
                toggleDiff = {toggleDiff}
            />
        );

        fireEvent.animationEnd(stateComponent.container.querySelector('.diff-circle'));

        assert.calledOnce(toggleDiff);
    });
});
