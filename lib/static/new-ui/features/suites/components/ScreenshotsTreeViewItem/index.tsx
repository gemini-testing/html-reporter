import {ArrowUturnCcwLeft, Check, Eye} from '@gravity-ui/icons';
import {Button, Icon, SegmentedRadioGroup as RadioButton, Select, Flex} from '@gravity-ui/uikit';
import React, {ReactNode, createRef, useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import {ImageEntity} from '@/static/new-ui/types/store';
import {DiffModeId, DiffModes, EditScreensFeature, TestStatus} from '@/constants';
import {
    setDiffMode,
    staticAccepterStageScreenshot,
    staticAccepterUnstageScreenshot
} from '@/static/modules/actions';
import {isAcceptable, isScreenRevertable} from '@/static/modules/utils';
import {getCurrentBrowser, getCurrentResult} from '@/static/new-ui/features/suites/selectors';
import {AssertViewStatus} from '@/static/new-ui/components/AssertViewStatus';
import styles from './index.module.css';
import {thunkAcceptImages, thunkRevertImages} from '@/static/modules/actions/screenshots';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';
import {ErrorHandler} from '../../../error-handling/components/ErrorHandling';
import {useNavigate, useParams} from 'react-router-dom';

interface ScreenshotsTreeViewItemProps {
    image: ImageEntity;
    style?: React.CSSProperties;
}

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
    if (node === null) {
        return null;
    }

    if (node.scrollHeight > node.clientHeight) {
        return node;
    } else {
        return getScrollParent(node.parentNode as HTMLElement);
    }
}

const MARGIN_TOP = 200; // enough for scroll below sticky header

export function ScreenshotsTreeViewItem(props: ScreenshotsTreeViewItemProps): ReactNode {
    const dispatch = useDispatch();
    const analytics = useAnalytics();
    const navigate = useNavigate();
    const {suiteId, stateName} = useParams();
    const ref = createRef<HTMLDivElement>();
    const inited = useRef(false);

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

    const onDiffModeChangeHandler = (diffModeId: DiffModeId): void => {
        dispatch(setDiffMode({diffModeId}));
    };

    const onScreenshotAccept = (): void => {
        analytics?.trackScreenshotsAccept();

        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterStageScreenshot([props.image.id]));
        } else {
            dispatch(thunkAcceptImages({imageIds: [props.image.id]}));
        }
    };
    const onScreenshotUndo = (): void => {
        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterUnstageScreenshot([props.image.id]));
        } else {
            dispatch(thunkRevertImages({imageIds: [props.image.id]}));
        }
    };

    const imageId = `${currentResult?.parentId} ${props.image.stateName}`;

    const onVisualChecks = (): void => {
        navigate(`/visual-checks/${encodeURIComponent(imageId)}/${currentResult?.attempt}`);
    };

    useEffect(() => {
        if (ref && ref.current && `${suiteId} ${stateName}` === imageId && inited && inited.current === false) {
            inited.current = true;
            const scrollContainer = getScrollParent(ref.current as HTMLElement);
            const topPosition = ref.current.getBoundingClientRect().top;

            scrollContainer?.scrollTo(0, topPosition - MARGIN_TOP);
        }
    }, []);

    return (
        <div style={props.style} className={styles.container} ref={ref}>
            {props.image.status !== TestStatus.SUCCESS && (
                <div className={styles.toolbarContainer}>
                    {!isDiffModeSwitcherVisible && (
                        <AssertViewStatus image={props.image}/>
                    )}
                    {isDiffModeSwitcherVisible && (
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
                    )}
                    <Flex className={styles.buttonsContainer} gap={2}>
                        <Button
                            view="outlined"
                            className={styles.goToVisual}
                            disabled={isRunning || isProcessing}
                            onClick={onVisualChecks}
                            qa="go-visual-button"
                        >
                            <Icon data={Eye}/>Go to Visual Checks
                        </Button>
                        {isEditScreensAvailable && (
                            <>
                                {isUndoAvailable && (
                                    <Button
                                        view="action"
                                        className={styles.acceptButton}
                                        disabled={isRunning || isProcessing}
                                        onClick={onScreenshotUndo}
                                    >
                                        <Icon data={ArrowUturnCcwLeft}/>Undo
                                    </Button>
                                )}
                                {isAcceptable(props.image) && (
                                    <Button
                                        view="action"
                                        className={styles.acceptButton}
                                        disabled={isRunning || isProcessing}
                                        onClick={onScreenshotAccept}
                                    >
                                        <Icon data={Check}/>Accept
                                    </Button>
                                )}
                            </>
                        )}
                    </Flex>
                </div>
            )}

            <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackDataCorruption />}>
                <AssertViewResult result={props.image} />
            </ErrorHandler.Boundary>
        </div>
    );
}
