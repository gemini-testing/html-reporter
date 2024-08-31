import {Flex} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {TestNameFilter} from '@/static/new-ui/features/suites/components/TestNameFilter';
import {SuitesTreeView} from '@/static/new-ui/features/suites/components/SuitesTreeView';
import {TestStatusFilter} from '@/static/new-ui/features/suites/components/TestStatusFilter';
import {BrowsersSelect} from '@/static/new-ui/features/suites/components/BrowsersSelect';
import {SuiteTitle} from '@/static/new-ui/features/suites/components/SuiteTitle';
import * as actions from '@/static/modules/actions';
import {CollapsibleSection} from '@/static/new-ui/features/suites/components/CollapsibleSection';
import {MetaInfo} from '@/static/new-ui/components/MetaInfo';
import {State} from '@/static/new-ui/types/store';
import {Card} from '@/static/new-ui/components/Card';
import {AttemptPicker} from '../../../../components/AttemptPicker';

import styles from './index.module.css';
import classNames from 'classnames';

interface SuitesPageProps {
    actions: typeof actions;
    currentResultId: string;
}

function SuitesPageInternal(props: SuitesPageProps): ReactNode {
    return <SplitViewLayout>
        <div>
            <Card className={classNames(styles.card, styles.treeViewCard)}>
                <h2 className={classNames('text-display-1', styles['card__title'])}>Suites</h2>
                <Flex gap={2}>
                    <TestNameFilter/>
                    <BrowsersSelect/>
                </Flex>
                <TestStatusFilter/>
                <SuitesTreeView/>
            </Card>
        </div>
        <div>
            <Card className={classNames(styles.card, styles.testViewCard)}>
                <SuiteTitle className={styles['card__title']} />
                <AttemptPicker onChange={(browserId, _, retryIndex): unknown => props.actions.changeTestRetry({browserId, retryIndex})} />
                <CollapsibleSection title={'Overview'} body={props.currentResultId && <div className={styles['collapsible-section__body']}>
                    <MetaInfo resultId={props.currentResultId} />
                </div>} id={'overview'}/>
            </Card>
        </div>
    </SplitViewLayout>;
}

export const SuitesPage = connect(
    (state: State) => {
        let resultIds: string[] = [];
        let currentResultId = '';
        const browserId = state.app.currentSuiteId;

        if (browserId && state.tree.browsers.byId[browserId]) {
            resultIds = state.tree.browsers.byId[browserId].resultIds;
            currentResultId = resultIds[state.tree.browsers.stateById[browserId].retryIndex];
        }

        return {
            currentResultId
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SuitesPageInternal);
