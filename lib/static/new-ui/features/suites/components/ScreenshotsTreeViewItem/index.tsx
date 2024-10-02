import {ArrowUturnCcwLeft, Check} from '@gravity-ui/icons';
import {Button, Icon, RadioButton, Select} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import {ImageEntity, ImageEntityFail, State} from '@/static/new-ui/types/store';
import {DiffModeId, DiffModes, EditScreensFeature, TestStatus} from '@/constants';
import {acceptTest, changeDiffMode, undoAcceptImage} from '@/static/modules/actions';
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
    const diffMode = useSelector((state: State) => state.view.diffMode);
    const isEditScreensAvailable = useSelector((state: State) => state.app.availableFeatures)
        .find(feature => feature.name === EditScreensFeature.name);
    const isRunning = useSelector((state: State) => state.running);
    const isGui = useSelector((state: State) => state.gui);

    const currentBrowser = useSelector(getCurrentBrowser);
    const currentResult = useSelector(getCurrentResult);
    const isLastResult = currentResult && currentBrowser && currentResult.id === currentBrowser.resultIds[currentBrowser.resultIds.length - 1];
    const isUndoAvailable = isScreenRevertable({gui: isGui, image: props.image, isLastResult, isStaticImageAccepterEnabled: false});

    const onDiffModeChangeHandler = (diffMode: DiffModeId): void => {
        dispatch(changeDiffMode(diffMode));
    };

    const onScreenshotAccept = (): void => {
        dispatch(acceptTest(props.image.id));
    };
    const onScreenshotUndo = (): void => {
        dispatch(undoAcceptImage(props.image.id));
    };

    return <div style={props.style} className={styles.container}>
        {props.image.status !== TestStatus.SUCCESS && <div className={styles.toolbarContainer}>
            {!(props.image as ImageEntityFail).diffImg &&
                <AssertViewStatus image={props.image}/>}
            {(props.image as ImageEntityFail).diffImg &&
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
                {isUndoAvailable && <Button view={'action'} className={styles.acceptButton} disabled={isRunning} onClick={onScreenshotUndo}>
                    <Icon data={ArrowUturnCcwLeft}/>Undo
                </Button>}
                {isAcceptable(props.image) && <Button view={'action'} className={styles.acceptButton} disabled={isRunning} onClick={onScreenshotAccept}>
                    <Icon data={Check}/>Accept
                </Button>}
            </div>}
        </div>}
        <AssertViewResult result={props.image} />
    </div>;
}
