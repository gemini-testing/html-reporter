import {connect, useDispatch as useReduxDispatch, useSelector as useReduxSelector} from 'react-redux';
import {UnknownAction} from 'redux';
import {ThunkDispatch} from 'redux-thunk';

import type {State} from '@/static/new-ui/types/store';
import type {Store} from '@/static/modules/actions/types';

export * from 'react-redux';
export {connect};

type AppDispatch = ThunkDispatch<State, unknown, UnknownAction> & ThunkDispatch<Store, void, UnknownAction>;

// Keep application state and thunk dispatch types in one place instead of repeating them for every hook call.
export const useSelector = useReduxSelector.withTypes<State>();
export const useDispatch = useReduxDispatch.withTypes<AppDispatch>();
