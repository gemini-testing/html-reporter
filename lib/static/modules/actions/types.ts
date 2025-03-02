import type {Action as ReduxAction} from 'redux';
export type {Dispatch} from 'redux';
import {ThunkAction} from 'redux-thunk';

import {GroupTestsAction} from '@/static/modules/actions/group-tests';
import {State} from '@/static/new-ui/types/store';
import {LifecycleAction} from '@/static/modules/actions/lifecycle';
import {SuitesPageAction} from '@/static/modules/actions/suites-page';
import {SortTestsAction} from '@/static/modules/actions/sort-tests';
import {GuiServerConnectionAction} from '@/static/modules/actions/gui-server-connection';
import {ScreenshotsAction} from '@/static/modules/actions/screenshots';
import {RunTestsAction} from '@/static/modules/actions/run-tests';
import {SuiteTreeStateAction} from '@/static/modules/actions/suites-tree-state';
import {ModalsAction} from '@/static/modules/actions/modals';
import {LoadingAction} from '@/static/modules/actions/loading';
import {CustomGuiAction} from '@/static/modules/actions/custom-gui';
import {FilterTestsAction} from '@/static/modules/actions/filter-tests';
import {SettingsAction} from '@/static/modules/actions/settings';
import {ProcessingAction} from '@/static/modules/actions/processing';
import {StaticAccepterAction} from '@/static/modules/actions/static-accepter';
import type actionNames from '../action-names';
import type defaultState from '../default-state';
import type {Tree} from '../../../tests-tree-builder/base';
import {FeaturesAction} from '@/static/modules/actions/features';
import {SnapshotsAction} from '@/static/modules/actions/snapshots';

export type Store = Omit<typeof defaultState, 'tree'> & {tree: Tree};

export type Action<
    Type extends typeof actionNames[keyof typeof actionNames],
    Payload = void
> = Payload extends void ? ReduxAction<Type> : ReduxAction<Type> & {payload: Payload};

export type AppThunk<ReturnType = Promise<void>> = ThunkAction<ReturnType, State, unknown, ReduxAction>;

export type SomeAction =
    | CustomGuiAction
    | FilterTestsAction
    | GroupTestsAction
    | GuiServerConnectionAction
    | LifecycleAction
    | LoadingAction
    | ModalsAction
    | ProcessingAction
    | RunTestsAction
    | ScreenshotsAction
    | SettingsAction
    | SortTestsAction
    | StaticAccepterAction
    | SuitesPageAction
    | SuiteTreeStateAction
    | FeaturesAction
    | SnapshotsAction;
