import React from 'react';
import DiffCircle from 'lib/static/components/state/diff-circle';
import {mkConnectedComponent} from '../utils';

describe('DiffCircle component', () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => sandbox.restore());

    it('should set "debounce" option', () => {
        const stateComponent = mkConnectedComponent(
            <DiffCircle
                diffTarget = {{offsetWidth: 10, style: {width: 10}, getBoundingClientRect: () => ({left: 10, top: 10})}}
                diffBounds = {{left: 5, top: 5, right: 5, bottom: 5}}
                display = {true}
                toggleDiff = {() => {}}
            />,
            {initialState: {view: {scaleImages: true}}}
        );

        const {width, height, top, left} = stateComponent.find('.diff-circle').prop('style');

        assert.deepEqual({width, height, top, left}, {width: '1px', height: '1px', top: '15px', left: '15px'});
    });

    it('should toggle diff when animation is ended', () => {
        const toggleDiff = sandbox.stub();
        const stateComponent = mkConnectedComponent(
            <DiffCircle
                diffTarget = {{offsetWidth: 30, style: {width: 10}, getBoundingClientRect: () => ({left: 10, top: 10})}}
                diffBounds = {{left: 5, top: 5, right: 5, bottom: 5}}
                display = {true}
                toggleDiff = {toggleDiff}
            />,
            {initialState: {view: {scaleImages: true}}}
        );

        stateComponent.find('.diff-circle').prop('onAnimationEnd')();

        assert.calledOnce(toggleDiff);
    });
});
