import actionNames from '../../action-names';
import {applyStateUpdate} from '../../utils/state';
import {
    GroupByErrorExpression,
    GroupByExpression,
    GroupByMetaExpression, GroupBySection,
    GroupByType,
    State
} from '@/static/new-ui/types/store';
import {SomeAction} from '@/static/modules/actions/types';
import {groupTests} from './utils';

export default (state: State, action: SomeAction): State => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const availableSections: GroupBySection[] = [{
                id: 'meta',
                label: 'Meta'
            }, {
                id: 'error',
                label: 'Error'
            }];

            const availableExpressions: GroupByExpression[] = [];

            const availableMetaKeys = new Set<string>();
            for (const result of Object.values(state.tree.results.byId)) {
                Object.keys(result.metaInfo).forEach(key => availableMetaKeys.add(key));
            }
            const availableMetaExpressions = Array.from(availableMetaKeys.values()).map((metaKey): GroupByMetaExpression => ({
                id: metaKey,
                type: GroupByType.Meta,
                sectionId: 'meta',
                key: metaKey
            }));
            availableExpressions.push(...availableMetaExpressions);

            availableExpressions.push({
                id: 'error-message',
                type: GroupByType.Error,
                sectionId: 'error'
            } satisfies GroupByErrorExpression);

            return applyStateUpdate(state, {
                app: {
                    groupTestsData: {
                        availableExpressions,
                        currentExpressionIds: [],
                        availableSections
                    }
                }
            });
        }

        case actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION: {
            const newExpressionIds = action.payload.expressionIds;

            const groupByExpressions = newExpressionIds
                .map(id => state.app.groupTestsData.availableExpressions.find(expr => expr.id === id) as GroupByExpression);
            const groupsById = groupTests(groupByExpressions, state.tree.results.byId, state.tree.images.byId, state.config.errorPatterns);

            return Object.assign({}, state, {
                tree: Object.assign({}, state.tree, {
                    groups: {
                        byId: groupsById,
                        allRootIds: Object.keys(groupsById)
                    }
                }),
                app: Object.assign({}, state.app, {
                    groupTestsData: Object.assign({}, state.app.groupTestsData, {
                        currentExpressionIds: newExpressionIds
                    })
                })
            });
        }

        default:
            return state;
    }
};
