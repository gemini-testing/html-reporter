import {ArrowRightArrowLeft, ArrowUturnCcwLeft, Check, Eye} from '@gravity-ui/icons';
import {Button, Hotkey, Icon, SegmentedRadioGroup as RadioButton, Select, Flex} from '@gravity-ui/uikit';
import React, {ReactNode, createRef, useCallback, useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import {ImageEntity} from '@/static/new-ui/types/store';
import {DiffModeId, EditScreensFeature, TestStatus, Page} from '@/constants';
import {getAvailableDiffModes} from '@/static/new-ui/utils/diffModes';
import {
    setDiffMode,
    staticAccepterStageScreenshot,
    staticAccepterUnstageScreenshot
} from '@/static/modules/actions';
import {isAcceptable, isScreenRevertable} from '@/static/modules/utils';
import {getCurrentBrowser, getCurrentResult, getCurrentBrowserId} from '@/static/new-ui/features/suites/selectors';
import {AssertViewStatus} from '@/static/new-ui/components/AssertViewStatus';
import styles from './index.module.css';
import {thunkAcceptImages, thunkRevertImages} from '@/static/modules/actions/screenshots';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';
import {useHotkey} from '@/static/new-ui/hooks/useHotkey';
import {ErrorHandler} from '../../../error-handling/components/ErrorHandling';
import {useNavigate, useParams} from 'react-router-dom';
import {getUrl} from '@/static/new-ui/utils/getUrl';
import {useFocusedImage} from '@/static/new-ui/features/suites/components/TestSteps/FocusedImageContext';

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
    const {hash, browser, stateName} = useParams();
    const ref = createRef<HTMLDivElement>();
    const inited = useRef(false);
    const suiteId = useSelector(getCurrentBrowserId({hash, browser}));

    const {focusedImageId, setFocusedImageId, registerImageId, unregisterImageId} = useFocusedImage();
    const isFocused = focusedImageId === props.image.id;

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
    const isAcceptAvailable = isAcceptable(props.image);

    useEffect(() => {
        registerImageId(props.image.id);
        return () => {
            unregisterImageId(props.image.id);
        };
    }, [props.image.id, registerImageId, unregisterImageId]);

    const onDiffModeChangeHandler = (diffModeId: DiffModeId): void => {
        dispatch(setDiffMode({diffModeId}));
    };

    const onScreenshotAccept = useCallback((): void => {
        analytics?.trackScreenshotsAccept();

        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterStageScreenshot([props.image.id]));
        } else {
            dispatch(thunkAcceptImages({imageIds: [props.image.id]}));
        }
    }, [analytics, isStaticImageAccepterEnabled, dispatch, props.image.id]);

    const onScreenshotUndo = useCallback((): void => {
        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterUnstageScreenshot([props.image.id]));
        } else {
            dispatch(thunkRevertImages({imageIds: [props.image.id]}));
        }
    }, [isStaticImageAccepterEnabled, dispatch, props.image.id]);

    const onVisualChecks = useCallback((): void => {
        navigate(getUrl({
            page: Page.visualChecksPage,
            hash,
            browser,
            stateName: props.image.stateName,
            attempt: currentResult?.attempt
        }));
    }, [navigate, hash, browser, props.image.stateName, currentResult?.attempt]);

    const imageId = `${currentResult?.parentId} ${props.image.stateName}`;

    const onMouseEnter = useCallback((): void => {
        setFocusedImageId(props.image.id);
    }, [setFocusedImageId, props.image.id]);

    const isAcceptEnabled = isFocused && Boolean(isEditScreensAvailable) && isAcceptAvailable && !isRunning && !isProcessing;
    const isUndoEnabled = isFocused && Boolean(isEditScreensAvailable) && isUndoAvailable && !isRunning && !isProcessing;
    const isGoEnabled = isFocused && !isRunning && !isProcessing;

    useHotkey('a', onScreenshotAccept, {enabled: isAcceptEnabled});
    useHotkey('u', onScreenshotUndo, {enabled: isUndoEnabled});
    useHotkey('g', onVisualChecks, {enabled: isGoEnabled});

    useEffect(() => {
        if (ref && ref.current && `${suiteId} ${stateName}` === imageId && inited && inited.current === false) {
            inited.current = true;
            const scrollContainer = getScrollParent(ref.current as HTMLElement);
            const topPosition = ref.current.getBoundingClientRect().top;

            scrollContainer?.scrollTo(0, topPosition - MARGIN_TOP);
        }
    }, []);

    return (
        <div style={props.style} className={styles.container} ref={ref} onMouseEnter={onMouseEnter}>
            {props.image.status !== TestStatus.SUCCESS && (
                <div className={styles.toolbarContainer}>
                    {!isDiffModeSwitcherVisible && (
                        <AssertViewStatus image={props.image}/>
                    )}
                    {isDiffModeSwitcherVisible && (
                        <div className={styles.diffModeContainer}>
                            <RadioButton onUpdate={onDiffModeChangeHandler} value={diffMode} className={styles.diffModeSwitcher}>
                                {getAvailableDiffModes(Page.suitesPage).map(diffMode =>
                                    <RadioButton.Option value={diffMode.id} content={diffMode.title} title={diffMode.description} key={diffMode.id}/>
                                )}
                            </RadioButton>
                            <Select
                                className={styles.diffModeSelect}
                                label={<Icon data={ArrowRightArrowLeft}/> as unknown as string} value={[diffMode]}
                                onUpdate={([diffMode]): void => onDiffModeChangeHandler(diffMode as DiffModeId)}
                                multiple={false}
                            >
                                {getAvailableDiffModes(Page.suitesPage).map(diffMode =>
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
                            <Icon data={Eye}/>Go to Visual Checks<Hotkey className={isFocused ? styles.hotkey : styles.hotkeyHidden} view="light" value="g" />
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
                                        <Icon data={ArrowUturnCcwLeft}/>Undo<Hotkey className={isFocused ? styles.hotkey : styles.hotkeyHidden} view="dark" value="u" />
                                    </Button>
                                )}
                                {isAcceptAvailable && (
                                    <Button
                                        view="action"
                                        className={styles.acceptButton}
                                        disabled={isRunning || isProcessing}
                                        onClick={onScreenshotAccept}
                                    >
                                        <Icon data={Check}/>Accept<Hotkey className={isFocused ? styles.hotkey : styles.hotkeyHidden} view="dark" value="a" />
                                    </Button>
                                )}
                            </>
                        )}
                    </Flex>
                </div>
            )}

            <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackDataCorruption />}>
                <AssertViewResult result={props.image} diffMode={diffMode} />
            </ErrorHandler.Boundary>
        </div>
    );
}
