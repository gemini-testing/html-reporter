import classNames from 'classnames';
import React, {ReactNode} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {ImageEntity, State} from '@/static/new-ui/types/store';
import * as actions from '@/static/modules/actions';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';
import {
    getCurrentImage,
    getCurrentNamedImage,
    getVisibleNamedImageIds,
    NamedImageEntity
} from '@/static/new-ui/features/visual-checks/selectors';
import {SuiteTitle} from '@/static/new-ui/components/SuiteTitle';
import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import styles from './index.module.css';

interface VisualChecksPageProps {
    currentNamedImage: NamedImageEntity | null;
    currentImage: ImageEntity | null;
    visibleNamedImageIds: string[];
    actions: typeof actions;
}

export function VisualChecksPageInternal({currentNamedImage, currentImage, visibleNamedImageIds, actions}: VisualChecksPageProps): ReactNode {
    const currentNamedImageIndex = visibleNamedImageIds.indexOf(currentNamedImage?.id as string);
    const onPreviousImageHandler = (): void => void actions.visualChecksPageSetCurrentNamedImage(visibleNamedImageIds[currentNamedImageIndex - 1]);
    const onNextImageHandler = (): void => void actions.visualChecksPageSetCurrentNamedImage(visibleNamedImageIds[currentNamedImageIndex + 1]);

    return <SplitViewLayout sections={[
        <UiCard key="tree-view" className={classNames(styles.card, styles.treeViewCard)}>
            <h2 className={classNames('text-display-1', styles['card__title'])}>Visual Checks</h2>
        </UiCard>,
        <UiCard key="test-view" className={classNames(styles.card, styles.testViewCard)}>
            <div className={styles.stickyHeader}>
                {currentNamedImage && <SuiteTitle
                    className={styles['card__title']}
                    suitePath={currentNamedImage.suitePath}
                    browserName={currentNamedImage.browserName}
                    index={currentNamedImageIndex}
                    totalItems={visibleNamedImageIds.length}
                    onPrevious={onPreviousImageHandler}
                    stateName={currentNamedImage.stateName}
                    onNext={onNextImageHandler}
                    imageStatus={currentNamedImage.status}/>}
            </div>
            {currentImage && <AssertViewResult result={currentImage}/>}
        </UiCard>
    ]}/>;
}

export const VisualChecksPage = connect(
    (state: State) => {
        const currentNamedImage = getCurrentNamedImage(state);
        const currentImage = getCurrentImage(state);

        return {
            currentNamedImage,
            currentImage,
            visibleNamedImageIds: getVisibleNamedImageIds(state)
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(VisualChecksPageInternal);
