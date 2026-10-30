import {Picture} from '@gravity-ui/icons';
import {Button, Hotkey, Icon, Flex} from '@gravity-ui/uikit';
import React, {ReactNode, createRef, useCallback, useEffect, useRef} from 'react';
import {useSelector} from '@/static/new-ui/modules/react-redux';

import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import {ImageEntity} from '@/static/new-ui/types/store';
import {TestStatus, Page} from '@/constants';
import {getCurrentBrowser, getCurrentResult, getCurrentBrowserId} from '@/static/new-ui/features/suites/selectors';
import {DiffModeSelector} from '@/static/new-ui/components/DiffModeSelector';
import {AssertViewStatus} from '@/static/new-ui/components/AssertViewStatus';
import styles from './index.module.css';
import {useHotkey} from '@/static/new-ui/hooks/useHotkey';
import {ErrorHandler} from '../../../error-handling/components/ErrorHandling';
import {useNavigate, useParams} from 'react-router';
import {getUrl} from '@/static/new-ui/utils/getUrl';
import {useFocusedImage} from '@/static/new-ui/features/suites/components/TestSteps/FocusedImageContext';
import {useIsRunning} from '@/static/new-ui/hooks/useIsRunning';
import {AcceptButton} from '@/static/new-ui/components/AcceptButton';

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
    const navigate = useNavigate();
    const {hash, browser, stateName} = useParams();
    const ref = createRef<HTMLDivElement>();
    const inited = useRef(false);
    const suiteId = useSelector(getCurrentBrowserId({hash, browser}));

    const {focusedImageId, setFocusedImageId, registerImageId, unregisterImageId} = useFocusedImage();
    const isFocused = focusedImageId === props.image.id;

    const diffMode = useSelector(state => state.view.diffMode);
    const isRunning = useIsRunning();
    const isProcessing = useSelector(state => state.processing);

    const isDiffModeSwitcherVisible = props.image.status === TestStatus.FAIL && props.image.diffImg;

    const currentBrowser = useSelector(getCurrentBrowser);
    const currentResult = useSelector(getCurrentResult);
    const isLastResult = currentResult && currentBrowser && currentResult.id === currentBrowser.resultIds[currentBrowser.resultIds.length - 1];

    useEffect(() => {
        registerImageId(props.image.id);
        return () => {
            unregisterImageId(props.image.id);
        };
    }, [props.image.id, registerImageId, unregisterImageId]);

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

    const onMouseLeave = useCallback((): void => {
        setFocusedImageId(null);
    }, [setFocusedImageId]);

    const isGoEnabled = isFocused && !isRunning && !isProcessing;

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
        <div style={props.style} className={styles.container} ref={ref} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            {props.image.status !== TestStatus.SUCCESS && (
                <div className={styles.toolbarContainer}>
                    {!isDiffModeSwitcherVisible && (
                        <AssertViewStatus image={props.image}/>
                    )}
                    {isDiffModeSwitcherVisible && <DiffModeSelector qa="diff-mode-select"/>}
                    <Flex className={styles.buttonsContainer} gap={2}>
                        <Button
                            view="outlined"
                            className={styles.goToVisual}
                            disabled={isRunning || isProcessing}
                            onClick={onVisualChecks}
                            qa="go-visual-button"
                        >
                            <Icon data={Picture}/>Go to Visual Checks<Hotkey className={isFocused ? styles.hotkey : styles.hotkeyHidden} view="light" value="g" />
                        </Button>
                        <AcceptButton imageId={props.image.id} isLastResult={isLastResult} isFocused={isFocused} />
                    </Flex>
                </div>
            )}

            <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackDataCorruption />}>
                <AssertViewResult result={props.image} diffMode={diffMode} />
            </ErrorHandler.Boundary>
        </div>
    );
}
