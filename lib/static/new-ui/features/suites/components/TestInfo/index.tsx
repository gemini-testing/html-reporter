import classNames from 'classnames';
import React, {ReactNode} from 'react';
import {useSelector} from 'react-redux';

import {CollapsibleSection} from '@/static/new-ui/features/suites/components/CollapsibleSection';
import {MetaInfo} from '@/static/new-ui/components/MetaInfo';
import {TestSteps} from '@/static/new-ui/features/suites/components/TestSteps';
import {getCurrentResult, isTimeTravelPlayerAvailable} from '@/static/new-ui/features/suites/selectors';
import {getTestSteps} from '@/static/new-ui/features/suites/components/TestSteps/selectors';
import {SnapshotsPlayer} from '@/static/new-ui/features/suites/components/SnapshotsPlayer';
import {ErrorHandler} from '@/static/new-ui/features/error-handling/components/ErrorHandling';
import {RunTestLoading} from '@/static/new-ui/components/RunTestLoading';

import styles from './index.module.css';

export function TestInfo(): ReactNode {
    const currentResult = useSelector(getCurrentResult);

    const steps = useSelector(getTestSteps);
    const isRunning = useSelector(state => state.running);
    const isPlayerAvailable = useSelector(isTimeTravelPlayerAvailable);
    const isPlayerVisible = useSelector(state => state.ui.suitesPage.isSnapshotsPlayerVisible);

    const shouldShowPlayer = isPlayerAvailable && isPlayerVisible;

    if (isRunning) {
        return <RunTestLoading />;
    }

    return <>
        <CollapsibleSection id={'actions'} title={'Actions'}>
            <div className={styles.stepsContainer}>
                {steps.length > 0 ?
                    <ErrorHandler.Boundary watchFor={[currentResult]} fallback={<ErrorHandler.FallbackDataCorruption />}>
                        <TestSteps className={styles.stepsListContainer}/>
                    </ErrorHandler.Boundary> :
                    <div className={styles.emptyStepsContainer}>No steps to show</div>
                }
                {isPlayerAvailable && <div className={classNames(styles.sticky, !shouldShowPlayer && styles.hidden)}>
                    <SnapshotsPlayer/>
                </div>}
            </div>
        </CollapsibleSection>
        <CollapsibleSection id={'metadata'} title={'Metadata'}>
            {currentResult && !isRunning && <div className={styles['collapsible-section__body']}>
                <MetaInfo resultId={currentResult.id}/>
            </div>}
        </CollapsibleSection>
    </>;
}
