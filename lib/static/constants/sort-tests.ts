import {SortByExpression, SortType} from '@/static/new-ui/types/store';

export const SORT_BY_NAME: SortByExpression = {id: 'by-name', label: 'Name', type: SortType.ByName};
export const SORT_BY_FAILED_RETRIES: SortByExpression = {id: 'by-failed-runs', label: 'Failed runs count', type: SortType.ByFailedRuns};
export const SORT_BY_TESTS_COUNT: SortByExpression = {id: 'by-tests-count', label: 'Tests count', type: SortType.ByTestsCount};
