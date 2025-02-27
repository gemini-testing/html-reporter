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
        <SplitViewLayout>
            <UiCard key="test-view" className={classNames(styles.card, styles.testViewCard)}>
                <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackCardCrash recommendedAction={'Try to reload page'} />}>
                    {isInitialized
                        ? <>
                            {currentNamedImage && <VisualChecksStickyHeader currentNamedImage={currentNamedImage}/>}

                            {currentImage && <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackCardCrash recommendedAction={'Try to choose another item'}/>}>
                                <AssertViewResult result={currentImage} />
                            </ErrorHandler.Boundary>}

                            {!currentImage && <div className={styles.hint}>This run doesn&apos;t have an image with name &quot;{currentNamedImage?.stateName}&quot;</div>}
                        </>
                        : <AssertViewResultSkeleton />}
                </ErrorHandler.Boundary>
            </UiCard>
        </SplitViewLayout>
    </div>;
}
