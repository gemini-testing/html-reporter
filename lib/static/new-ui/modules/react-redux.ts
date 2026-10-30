import {useDispatch as useReduxDispatch, useSelector as useReduxSelector} from 'react-redux';
import {UnknownAction} from 'redux';
import {ThunkDispatch} from 'redux-thunk';

import type {State} from '@/static/new-ui/types/store';

type AppDispatch = ThunkDispatch<State, unknown, UnknownAction>;

// Keep application state and thunk dispatch types in one place instead of repeating them for every hook call.
export const useSelector = useReduxSelector.withTypes<State>();
export const useDispatch = useReduxDispatch.withTypes<AppDispatch>();
