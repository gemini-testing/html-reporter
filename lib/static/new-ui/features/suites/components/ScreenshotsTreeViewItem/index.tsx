import {ArrowUturnCcwLeft, Check} from '@gravity-ui/icons';
import {Button, Icon, RadioButton, Select} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import {ImageEntity} from '@/static/new-ui/types/store';
import {DiffModeId, DiffModes, EditScreensFeature, TestStatus} from '@/constants';
import {
    acceptTest,
    changeDiffMode,
    staticAccepterStageScreenshot,
    staticAccepterUnstageScreenshot,
    undoAcceptImage
} from '@/static/modules/actions';
import {isAcceptable, isScreenRevertable} from '@/static/modules/utils';
import {getCurrentBrowser, getCurrentResult} from '@/static/new-ui/features/suites/selectors';
import {AssertViewStatus} from '@/static/new-ui/components/AssertViewStatus';
import styles from './index.module.css';

interface ScreenshotsTreeViewItemProps {
    image: ImageEntity;
    style?: React.CSSProperties;
}

export function ScreenshotsTreeViewItem(props: ScreenshotsTreeViewItemProps): ReactNode {
    const dispatch = useDispatch();
    const diffMode = useSelector(state => state.view.diffMode);
    const isEditScreensAvailable = useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === EditScreensFeature.name);
    const isStaticImageAccepterEnabled = useSelector(state => state.staticImageAccepter.enabled);
    const isRunning = useSelector(state => state.running);
    const isProcessing = useSelector(state => state.processing);
    const isGui = useSelector(state => state.gui);

    const isDiffModeSwitcherVisible = props.image.status === TestStatus.FAIL && props.image.diffImg;

    const currentBrowser = useSelector(getCurrentBrowser);
    const currentResult = useSelector(getCurrentResult);
    const isLastResult = currentResult && currentBrowser && currentResult.id === currentBrowser.resultIds[currentBrowser.resultIds.length - 1];
    const isUndoAvailable = isScreenRevertable({gui: isGui, image: props.image, isLastResult, isStaticImageAccepterEnabled});

    const onDiffModeChangeHandler = (diffMode: DiffModeId): void => {
        dispatch(changeDiffMode(diffMode));
    };

    const onScreenshotAccept = (): void => {
        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterStageScreenshot([props.image.id]));
        } else {
            dispatch(acceptTest(props.image.id));
        }
    };
    const onScreenshotUndo = (): void => {
        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterUnstageScreenshot([props.image.id]));
        } else {
            dispatch(undoAcceptImage(props.image.id));
        }
    };

    return <div style={props.style} className={styles.container}>
        {props.image.status !== TestStatus.SUCCESS && <div className={styles.toolbarContainer}>
            {!isDiffModeSwitcherVisible &&
                <AssertViewStatus image={props.image}/>}
            {isDiffModeSwitcherVisible &&
                <div className={styles.diffModeContainer}>
                    <RadioButton onUpdate={onDiffModeChangeHandler} value={diffMode} className={styles.diffModeSwitcher}>
                        {Object.values(DiffModes).map(diffMode =>
                            <RadioButton.Option value={diffMode.id} content={diffMode.title} title={diffMode.description} key={diffMode.id}/>
                        )}
                    </RadioButton>
                    <Select
                        className={styles.diffModeSelect}
                        label="Diff Mode" value={[diffMode]}
                        onUpdate={([diffMode]): void => onDiffModeChangeHandler(diffMode as DiffModeId)}
                        multiple={false}
                    >
                        {Object.values(DiffModes).map(diffMode =>
                            <Select.Option value={diffMode.id} content={diffMode.title} title={diffMode.description} key={diffMode.id}/>
                        )}
                    </Select>
                </div>
            }
            {isEditScreensAvailable && <div className={styles.buttonsContainer}>
                {isUndoAvailable && <Button view={'action'} className={styles.acceptButton} disabled={isRunning || isProcessing} onClick={onScreenshotUndo}>
                    <Icon data={ArrowUturnCcwLeft}/>Undo
                </Button>}
                {isAcceptable(props.image) && <Button view={'action'} className={styles.acceptButton} disabled={isRunning || isProcessing} onClick={onScreenshotAccept}>
                    <Icon data={Check}/>Accept
                </Button>}
            </div>}
        </div>}
        <AssertViewResult result={props.image} />
    </div>;
}
