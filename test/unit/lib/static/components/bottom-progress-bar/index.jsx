import React from 'react';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../utils';

describe('<BottomProgressBar/> component', () => {
    const sandbox = sinon.sandbox.create();
    const getVisibleRootSuiteIdsStub = sinon.stub();
    let BottomProgressBar;

    const mkBottomProgressBarComponent = ({currentRootSuiteId = 'id1', visibleRootSuiteIds = ['id1', 'id2']}) => {
        getVisibleRootSuiteIdsStub.returns(visibleRootSuiteIds);

        return mkConnectedComponent(<BottomProgressBar/>, {initialState: {progressBar: {currentRootSuiteId}}});
    };

    beforeEach(() => {
        BottomProgressBar = proxyquire('lib/static/components/bottom-progress-bar', {
            '../../modules/selectors/tree': {
                getVisibleRootSuiteIds: getVisibleRootSuiteIdsStub
            }
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('should correctly calculate width for progress', () => {
        it('0%', () => {
            const component = mkBottomProgressBarComponent({
                currentRootSuiteId: 'id1',
                visibleRootSuiteIds: ['id1', 'id2', 'id3', 'id4', 'id5']
            });

            assert.equal(component.container.querySelector('.bottom-progress-bar__progress-bar').style.width, '0%');
        });

        it('50%', () => {
            const component = mkBottomProgressBarComponent({
                currentRootSuiteId: 'id3',
                visibleRootSuiteIds: ['id1', 'id2', 'id3', 'id4', 'id5']
            });

            assert.equal(component.container.querySelector('.bottom-progress-bar__progress-bar').style.width, '50%');
        });

        it('100%', () => {
            const component = mkBottomProgressBarComponent({
                currentRootSuiteId: 'id5',
                visibleRootSuiteIds: ['id1', 'id2', 'id3', 'id4', 'id5']
            });

            assert.equal(component.container.querySelector('.bottom-progress-bar__progress-bar').style.width, '100%');
        });
    });

    it('should correctly format text on progress-bar', () => {
        const component = mkBottomProgressBarComponent({
            currentRootSuiteId: 'id2',
            visibleRootSuiteIds: ['id1', 'id2', 'id3']
        });

        assert.equal(component.container.querySelector('.bottom-progress-bar__counter').textContent, 'id2 (2 suite of 3)');
    });
});
