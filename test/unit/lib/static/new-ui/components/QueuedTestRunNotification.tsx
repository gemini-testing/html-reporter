import React from 'react';
import {Provider} from 'react-redux';
import {act, render} from '@testing-library/react';
import sinon from 'sinon';
import {Toaster, ToasterProvider} from '@gravity-ui/uikit';
import {QueuedTestRunNotification} from '@/static/new-ui/components/QueuedTestRunNotification';
import actionNames from '@/static/modules/action-names';
import {mkRealStore} from '../../utils';
import defaultState from '@/static/modules/default-state';
import type {State} from '@/static/new-ui/types/store';

describe('<QueuedTestRunNotification />', () => {
    it('should offer cancellation and remove the notification when the queue is cleared', () => {
        const store = mkRealStore({initialState: defaultState as State, middlewares: []});
        const toaster = new Toaster();
        const add = sinon.spy(toaster, 'add');
        const remove = sinon.spy(toaster, 'remove');
        const component = render(<ToasterProvider toaster={toaster}>
            <Provider store={store}><QueuedTestRunNotification /></Provider>
        </ToasterProvider>);

        assert.notCalled(add);
        act(() => {
            store.dispatch({type: actionNames.QUEUE_TEST_RUN, payload: {tests: [], repeatCount: 1}});
        });

        assert.calledOnce(add);
        const notification = add.firstCall.args[0];
        assert.isFalse(notification.autoHiding);
        assert.equal(notification.actions?.[0].label, 'Cancel');
        act(() => {
            notification.actions?.[0].onClick();
        });

        assert.isNull(store.getState().app.queuedTestRun);
        assert.isFalse(store.getState().running);
        assert.calledWith(remove, 'queued-test-run');
        component.unmount();
    });
});
