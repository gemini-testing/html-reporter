import React, {ReactNode} from 'react';
import {CollapsibleSection} from '@/static/new-ui/features/suites/components/CollapsibleSection';
import {MetaInfo} from '@/static/new-ui/components/MetaInfo';
import {TestSteps} from '@/static/new-ui/features/suites/components/TestSteps';
import {getCurrentResult, isTimeTravelPlayerAvailable} from '@/static/new-ui/features/suites/selectors';
import {useSelector} from 'react-redux';

import styles from './index.module.css';
import {Spin} from '@gravity-ui/uikit';

import {getTestSteps} from '@/static/new-ui/features/suites/components/TestSteps/selectors';
import {SnapshotsPlayer} from '@/static/new-ui/experiments/time-travel/components/SnapshotsPlayer';
import classNames from 'classnames';

export function TestInfo(): ReactNode {
    const currentResult = useSelector(getCurrentResult);

    const steps = useSelector(getTestSteps);
    const isRunning = useSelector(state => state.running);
    const isPlayerAvailable = useSelector(isTimeTravelPlayerAvailable);
    const isPlayerVisible = useSelector(state => state.ui.suitesPage.isSnapshotsPlayerVisible);

    const shouldShowPlayer = isPlayerAvailable && isPlayerVisible;

    return <>
        <CollapsibleSection id={'actions'} title={'Actions'}>
            <div className={styles.stepsContainer}>
                {steps.length > 0 ?
                    <TestSteps className={styles.stepsListContainer}/> :
                    <div className={styles.emptyStepsContainer}>{isRunning ? <><Spin size={'xs'} style={{marginRight: '4px'}} />Test is running</> : 'No steps to show'}</div>
                }
                {<div className={classNames(styles.sticky, !shouldShowPlayer && styles.hidden)}>
                    <SnapshotsPlayer/>
                </div>}
            </div>
        </CollapsibleSection>
        <CollapsibleSection id={'metadata'} title={'Metadata'}>
            {currentResult && <div className={styles['collapsible-section__body']}>
                <MetaInfo resultId={currentResult.id}/>
            </div>}
        </CollapsibleSection>
    </>;
}
