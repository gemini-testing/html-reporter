import {ArrowUturnCcwLeft, Check} from '@gravity-ui/icons';
import {Button, Divider, Icon, Select} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {
    getCurrentImage, getVisibleNamedImageIds,
    NamedImageEntity
} from '@/static/new-ui/features/visual-checks/selectors';
import {SuiteTitle} from '@/static/new-ui/components/SuiteTitle';
import styles from './index.module.css';
import {CompactAttemptPicker} from '@/static/new-ui/components/CompactAttemptPicker';
import {DiffModeId, DiffModes, EditScreensFeature} from '@/constants';
import {
    setDiffMode,
    staticAccepterStageScreenshot, staticAccepterUnstageScreenshot,
    visualChecksPageSetCurrentNamedImage
} from '@/static/modules/actions';
import {isAcceptable, isScreenRevertable} from '@/static/modules/utils';
import {AssertViewStatus} from '@/static/new-ui/components/AssertViewStatus';
import {thunkAcceptImages, thunkRevertImages} from '@/static/modules/actions/screenshots';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';

interface VisualChecksStickyHeaderProps {
    currentNamedImage: NamedImageEntity | null;
}

export function VisualChecksStickyHeader({currentNamedImage}: VisualChecksStickyHeaderProps): ReactNode {
    const dispatch = useDispatch();

    const analytics = useAnalytics();

    const currentImage = useSelector(getCurrentImage);

    const visibleNamedImageIds = useSelector(getVisibleNamedImageIds);

    const currentNamedImageIndex = visibleNamedImageIds.indexOf(currentNamedImage?.id as string);
    const onPreviousImageHandler = (): void => void dispatch(visualChecksPageSetCurrentNamedImage(visibleNamedImageIds[currentNamedImageIndex - 1]));
    const onNextImageHandler = (): void => void dispatch(visualChecksPageSetCurrentNamedImage(visibleNamedImageIds[currentNamedImageIndex + 1]));

    const diffMode = useSelector(state => state.view.diffMode);
    const onChangeHandler = (diffModeId: DiffModeId): void => {
        dispatch(setDiffMode({diffModeId}));
    };

    const isStaticImageAccepterEnabled = useSelector(state => state.staticImageAccepter.enabled);
    const isEditScreensAvailable = useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === EditScreensFeature.name);
    const isRunning = useSelector(state => state.running);
    const isProcessing = useSelector(state => state.processing);
    const isGui = useSelector(state => state.gui);

    const onScreenshotAccept = (): void => {
        if (!currentImage) {
            return;
        }
        analytics?.trackScreenshotsAccept();

        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterStageScreenshot([currentImage.id]));
        } else {
            dispatch(thunkAcceptImages({imageIds: [currentImage.id]}));
        }
    };
    const onScreenshotUndo = (): void => {
        if (!currentImage) {
            return;
        }

        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterUnstageScreenshot([currentImage.id]));
        } else {
            dispatch(thunkRevertImages({imageIds: [currentImage.id]}));
        }
    };

    const currentBrowserId = useSelector(state => state.tree.results.byId[currentImage?.parentId ?? '']?.parentId);
    const currentBrowser = useSelector(state => currentBrowserId && state.tree.browsers.byId[currentBrowserId]);

    const currentResultId = currentImage?.parentId;
    const isLastResult = Boolean(currentResultId && currentBrowser && currentResultId === currentBrowser.resultIds[currentBrowser.resultIds.length - 1]);
    const isUndoAvailable = isScreenRevertable({gui: isGui, image: currentImage ?? {}, isLastResult, isStaticImageAccepterEnabled});

    return <div className={styles.stickyHeader}>
        {currentNamedImage && <SuiteTitle
            className={styles['card__title']}
            suitePath={currentNamedImage.suitePath}
            browserName={currentNamedImage.browserName}
            index={currentNamedImageIndex}
            totalItems={visibleNamedImageIds.length}
            onPrevious={onPreviousImageHandler}
            stateName={currentNamedImage.stateName}
            onNext={onNextImageHandler}/>
        }

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
                {isUndoAvailable && <Button view={'action'} className={styles.acceptButton} disabled={isRunning || isProcessing} onClick={onScreenshotUndo}><Icon
                    data={ArrowUturnCcwLeft}/>Undo</Button>}
                {currentImage && isAcceptable(currentImage) && <Button view={'action'} className={styles.acceptButton} disabled={isRunning || isProcessing} onClick={onScreenshotAccept}><Icon
                    data={Check}/>Accept</Button>}
            </div>}
        </div>
    </div>;
}
