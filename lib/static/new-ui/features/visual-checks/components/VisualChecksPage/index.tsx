import {ArrowUturnCcwLeft, Check} from '@gravity-ui/icons';
import {Button, Divider, Icon, Select} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {State} from '@/static/new-ui/types/store';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';
import {
    getCurrentImage,
    getCurrentNamedImage,
    getVisibleNamedImageIds
} from '@/static/new-ui/features/visual-checks/selectors';
import {SuiteTitle} from '@/static/new-ui/components/SuiteTitle';
import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import styles from './index.module.css';
import {CompactAttemptPicker} from '@/static/new-ui/components/CompactAttemptPicker';
import {DiffModeId, DiffModes, EditScreensFeature} from '@/constants';
import {
    acceptTest,
    changeDiffMode,
    undoAcceptImage,
    visualChecksPageSetCurrentNamedImage
} from '@/static/modules/actions';
import {isAcceptable, isScreenRevertable} from '@/static/modules/utils';
import {AssertViewStatus} from '@/static/new-ui/components/AssertViewStatus';
import {
    AssertViewResultSkeleton
} from '@/static/new-ui/features/visual-checks/components/VisualChecksPage/AssertViewResultSkeleton';

export function VisualChecksPage(): ReactNode {
    const dispatch = useDispatch();

    const currentNamedImage = useSelector(getCurrentNamedImage);
    const currentImage = useSelector(getCurrentImage);
    const visibleNamedImageIds = useSelector(getVisibleNamedImageIds);

    const currentNamedImageIndex = visibleNamedImageIds.indexOf(currentNamedImage?.id as string);
    const onPreviousImageHandler = (): void => void dispatch(visualChecksPageSetCurrentNamedImage(visibleNamedImageIds[currentNamedImageIndex - 1]));
    const onNextImageHandler = (): void => void dispatch(visualChecksPageSetCurrentNamedImage(visibleNamedImageIds[currentNamedImageIndex + 1]));

    const diffMode = useSelector((state: State) => state.view.diffMode);
    const onChangeHandler = (diffMode: DiffModeId): void => {
        dispatch(changeDiffMode(diffMode));
    };

    const isEditScreensAvailable = useSelector((state: State) => state.app.availableFeatures)
        .find(feature => feature.name === EditScreensFeature.name);
    const isRunning = useSelector((state: State) => state.running);
    const isGui = useSelector((state: State) => state.gui);

    const onScreenshotAccept = (): void => {
        if (currentImage) {
            dispatch(acceptTest(currentImage.id));
        }
    };
    const onScreenshotUndo = (): void => {
        if (currentImage) {
            dispatch(undoAcceptImage(currentImage.id));
        }
    };

    const currentBrowserId = useSelector((state: State) => state.tree.results.byId[currentImage?.parentId ?? '']?.parentId);
    const currentBrowser = useSelector((state: State) => currentBrowserId && state.tree.browsers.byId[currentBrowserId]);

    const currentResultId = currentImage?.parentId;
    const isLastResult = Boolean(currentResultId && currentBrowser && currentResultId === currentBrowser.resultIds[currentBrowser.resultIds.length - 1]);
    const isUndoAvailable = isScreenRevertable({gui: isGui, image: currentImage ?? {}, isLastResult, isStaticImageAccepterEnabled: false});

    const isInitialized = useSelector((state: State) => state.app.isInitialized);

    return <div className={styles.container}><SplitViewLayout sections={[
        <UiCard key="test-view" className={classNames(styles.card, styles.testViewCard)}>
            {isInitialized && <><div className={styles.stickyHeader}>
                {currentNamedImage && <SuiteTitle
                    className={styles['card__title']}
                    suitePath={currentNamedImage.suitePath}
                    browserName={currentNamedImage.browserName}
                    index={currentNamedImageIndex}
                    totalItems={visibleNamedImageIds.length}
                    onPrevious={onPreviousImageHandler}
                    stateName={currentNamedImage.stateName}
                    onNext={onNextImageHandler}/>}
                <div className={styles.toolbarContainer}>
                    <CompactAttemptPicker/>
                    <Divider orientation={'vertical'}/>
                    <AssertViewStatus image={currentImage}/>
                    <Divider orientation={'vertical'}/>
                    <Select className={styles.diffModeSelect} label='Diff Mode' value={[diffMode]} onUpdate={([diffMode]): void => onChangeHandler(diffMode as DiffModeId)} multiple={false}>
                        {Object.values(DiffModes).map(diffMode =>
                            <Select.Option value={diffMode.id} content={diffMode.title} title={diffMode.description} key={diffMode.id}/>
                        )}
                    </Select>
                    {isEditScreensAvailable && <div className={styles.buttonsContainer}>
                        {isUndoAvailable && <Button view={'action'} className={styles.acceptButton} disabled={isRunning} onClick={onScreenshotUndo}><Icon
                            data={ArrowUturnCcwLeft}/>Undo</Button>}
                        {currentImage && isAcceptable(currentImage) && <Button view={'action'} className={styles.acceptButton} disabled={isRunning} onClick={onScreenshotAccept}><Icon
                            data={Check}/>Accept</Button>}
                    </div>}
                </div>
            </div>
            {currentImage && <AssertViewResult result={currentImage}/>}
            {!currentImage && <div className={styles.hint}>This run doesn&apos;t have an image with
                name &quot;{currentNamedImage?.stateName}&quot;</div>}
            </>}
            {!isInitialized && <AssertViewResultSkeleton />}
        </UiCard>
    ]}/></div>;
}
