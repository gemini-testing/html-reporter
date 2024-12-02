import type actionNames from '../action-names';
import type {Action as ReduxAction} from 'redux';
import type defaultState from '../default-state';
import type {Tree} from '../../../tests-tree-builder/base';
import {GroupTestsAction} from '@/static/modules/actions/group-tests';
import {ThunkAction} from 'redux-thunk';
import {State} from '@/static/new-ui/types/store';
import {LifecycleAction} from '@/static/modules/actions/lifecycle';
import {SuitesPageAction} from '@/static/modules/actions/suites-page';
import {SortTestsAction} from '@/static/modules/actions/sort-tests';

export type {Dispatch} from 'redux';

export type Store = Omit<typeof defaultState, 'tree'> & {tree: Tree};

export type Action<
    Type extends typeof actionNames[keyof typeof actionNames],
    Payload = void
> = Payload extends void ? ReduxAction<Type> : ReduxAction<Type> & {payload: Payload};

export type AppThunk<ReturnType = Promise<void>> = ThunkAction<ReturnType, State, unknown, ReduxAction>;

export type SomeAction =
    | GroupTestsAction
    | LifecycleAction
    | SuitesPageAction
    | SortTestsAction;
