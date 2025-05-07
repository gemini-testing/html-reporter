import React, {ReactNode} from 'react';
import {CollapsibleSection} from '@/static/new-ui/features/suites/components/CollapsibleSection';
import {MetaInfo} from '@/static/new-ui/components/MetaInfo';
import {TestSteps} from '@/static/new-ui/features/suites/components/TestSteps';
import {getCurrentResult} from '@/static/new-ui/features/suites/selectors';
import {useSelector} from 'react-redux';

import styles from './index.module.css';
import {Spin} from '@gravity-ui/uikit';
import {BrowserFeature} from '@/constants';
import {AttachmentType} from '@/types';

import {getTestSteps} from '@/static/new-ui/features/suites/components/TestSteps/selectors';
import {SnapshotsPlayer} from '@/static/new-ui/experiments/time-travel/components/SnapshotsPlayer';

export function TestInfo(): ReactNode {
    const currentResult = useSelector(getCurrentResult);
    const browserFeatures = useSelector(state => state.browserFeatures);

    const steps = useSelector(getTestSteps);
    const isRunning = useSelector(state => state.running);

    const isSnapshotAvailable = currentResult?.attachments?.some(attachment => attachment.type === AttachmentType.Snapshot);
    const isLiveStreamingAvailable = browserFeatures[currentResult?.name ?? '']?.some(feature => feature === BrowserFeature.LiveSnapshotsStreaming);
    const shouldShowPlayer = isSnapshotAvailable || (isRunning && isLiveStreamingAvailable);

    return <>
        <CollapsibleSection id={'actions'} title={'Actions'}>
            <div className={styles.stepsContainer}>
                {steps.length > 0 ?
                    <TestSteps className={styles.stepsListContainer}/> :
                    <div className={styles.emptyStepsContainer}>{isRunning ? <><Spin size={'xs'} style={{marginRight: '4px'}} />Test is running</> : 'No steps to show'}</div>
                }
                {shouldShowPlayer && <div className={styles.sticky}>
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
