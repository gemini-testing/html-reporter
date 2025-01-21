import classNames from 'classnames';
import React, {ReactNode} from 'react';
import {useSelector} from 'react-redux';

import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';
import {
    getCurrentImage,
    getCurrentNamedImage
} from '@/static/new-ui/features/visual-checks/selectors';
import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import styles from './index.module.css';
import {
    AssertViewResultSkeleton
} from '@/static/new-ui/features/visual-checks/components/VisualChecksPage/AssertViewResultSkeleton';
import {VisualChecksStickyHeader} from './VisualChecksStickyHeader';
import {ErrorHandler} from '../../../error-handling/components/ErrorHandling';

export function VisualChecksPage(): ReactNode {
    const currentNamedImage = useSelector(getCurrentNamedImage);
    const currentImage = useSelector(getCurrentImage);

    const isInitialized = useSelector(state => state.app.isInitialized);

    return <div className={styles.container}>
        <SplitViewLayout sections={[
            <UiCard key="test-view" className={classNames(styles.card, styles.testViewCard)}>
                <ErrorHandler.Root fallback={<ErrorHandler.FallbackAppCrash />}>
                    {isInitialized
                        ? <>
                            {currentNamedImage && <VisualChecksStickyHeader currentNamedImage={currentNamedImage}/>}
                            {currentImage && <AssertViewResult result={currentImage}/>}
                            {!currentImage && <div className={styles.hint}>This run doesn&apos;t have an image with name &quot;{currentNamedImage?.stateName}&quot;</div>}
                        </>
                        : <AssertViewResultSkeleton />}
                </ErrorHandler.Root>
            </UiCard>
        ]}/>
    </div>;
}
