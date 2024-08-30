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
import {AttemptPicker} from '../../../../components/AttemptPicker';
import * as actions from '@/static/modules/actions';
import {CollapsibleSection} from '@/static/new-ui/features/suites/components/CollapsibleSection';
import {MetaInfo} from '@/static/new-ui/components/MetaInfo';
import {State} from '@/static/new-ui/types/store';

import styles from './index.module.css';

interface SuitesPageProps {
    actions: typeof actions;
    currentResultId: string;
}

function SuitesPageInternal(props: SuitesPageProps): ReactNode {
    return <SplitViewLayout>
        <div>
            <Flex direction={'column'} spacing={{p: '2'}} style={{height: '100vh'}}>
                <h2 className="text-display-1">Suites</h2>
                <Flex gap={2}>
                    <TestNameFilter/>
                    <BrowsersSelect/>
                </Flex>
                <Flex spacing={{mt: 2}}>
                    <TestStatusFilter/>
                </Flex>
                <SuitesTreeView/>
            </Flex>
        </div>
        <div>
            <Flex direction={'column'} spacing={{p: '2'}} style={{height: '100vh'}} gap={4}>
                <SuiteTitle/>
                <AttemptPicker onChange={(browserId, _, retryIndex): unknown => props.actions.changeTestRetry({browserId, retryIndex})} />
                <CollapsibleSection title={'Overview'} body={props.currentResultId && <div className={styles['collapsible-section__body']}>
                    <MetaInfo resultId={props.currentResultId} />
                </div>} id={'overview'}/>
            </Flex>
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
