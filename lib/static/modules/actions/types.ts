import type actionNames from '../action-names';
import type {Action as ReduxAction} from 'redux';
import type defaultState from '../default-state';
import type {Tree} from '../../../tests-tree-builder/base';

export type {Dispatch} from 'redux';

export type Store = Omit<typeof defaultState, 'tree'> & {tree: Tree};

export type Action<
    Type extends typeof actionNames[keyof typeof actionNames],
    Payload = void
> = Payload extends void ? ReduxAction<Type> : ReduxAction<Type> & {payload: Payload};
