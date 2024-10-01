import {Check, ArrowUturnCcwLeft} from '@gravity-ui/icons';
import {Button, Icon, RadioButton, Select} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import {ImageEntity, State} from '@/static/new-ui/types/store';
import {DiffModeId, DiffModes, EditScreensFeature} from '@/constants';
import {acceptTest, changeDiffMode, undoAcceptImage} from '@/static/modules/actions';
import styles from './index.module.css';
import {isAcceptable, isScreenRevertable} from '@/static/modules/utils';
import {getCurrentBrowser, getCurrentResult} from '@/static/new-ui/features/suites/selectors';

interface ScreenshotsTreeViewItemProps {
    result: ImageEntity;
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
    const isUndoAvailable = isScreenRevertable({gui: isGui, image: props.result, isLastResult, isStaticImageAccepterEnabled: false});

    const onChangeHandler = (diffMode: DiffModeId): void => {
        dispatch(changeDiffMode(diffMode));
    };

    const onScreenshotAccept = (): void => {
        dispatch(acceptTest(props.result.id));
    };
    const onScreenshotUndo = (): void => {
        dispatch(undoAcceptImage(props.result.id));
    };

    return <div style={props.style} className={styles.container}>
        <div className={styles.toolbarContainer}>
            <div className={styles.diffModeContainer}>
                <RadioButton onUpdate={onChangeHandler} value={diffMode} className={styles.diffModeSwitcher}>
                    {Object.values(DiffModes).map(diffMode =>
                        <RadioButton.Option value={diffMode.id} content={diffMode.title} title={diffMode.description} key={diffMode.id}/>
                    )}
                </RadioButton>
                <Select className={styles.diffModeSelect} label='Diff Mode' value={[diffMode]} onUpdate={([diffMode]): void => onChangeHandler(diffMode as DiffModeId)} multiple={false}>
                    {Object.values(DiffModes).map(diffMode =>
                        <Select.Option value={diffMode.id} content={diffMode.title} title={diffMode.description} key={diffMode.id}/>
                    )}
                </Select>
            </div>
            {isEditScreensAvailable && <>
                {isUndoAvailable && <Button view={'action'} className={styles.acceptButton} disabled={isRunning} onClick={onScreenshotUndo}><Icon
                    data={ArrowUturnCcwLeft}/>Undo</Button>}
                {isAcceptable(props.result) && <Button view={'action'} className={styles.acceptButton} disabled={isRunning} onClick={onScreenshotAccept}><Icon
                    data={Check}/>Accept</Button>}
            </>}
        </div>
        <AssertViewResult result={props.result} />
    </div>;
}
