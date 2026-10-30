import React, {MouseEventHandler, ReactNode, useCallback} from 'react';
import classnames from 'classnames';
import {useDispatch, useSelector} from '@/static/new-ui/modules/react-redux';
import {ArrowUturnCcwLeft, Check} from '@gravity-ui/icons';
import {Icon, Hotkey, Button, ButtonView} from '@gravity-ui/uikit';

import styles from './index.module.css';
import {isAcceptable, isScreenRevertable} from '@/static/modules/utils';
import {useIsRunning} from '@/static/new-ui/hooks/useIsRunning';
import {
    staticAccepterStageScreenshot,
    staticAccepterUnstageScreenshot,
    thunkAcceptImages, thunkRevertImages
} from '@/static/modules/actions';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';
import {EditScreensFeature, Page} from '@/constants';
import {useHotkey} from '@/static/new-ui/hooks/useHotkey';
import {usePage} from '@/static/new-ui/hooks/usePage';

interface AcceptButtonProps {
    className?: string;
    imageId: string;
    isLastResult?: boolean | null;
    isFocused?: boolean;
    view?: ButtonView;
    onAccept?: (startIndex: string) => void;
}

export const AcceptButton = ({className, imageId, isLastResult = true, isFocused = false, view = 'action', onAccept}: AcceptButtonProps): ReactNode => {
    const page = usePage();
    const dispatch = useDispatch();
    const analytics = useAnalytics();
    const isRunning = useIsRunning();
    const isProcessing = useSelector(state => state.processing);
    const isStaticImageAccepterEnabled = useSelector(state => state.staticImageAccepter.enabled);
    const isGui = useSelector(state => state.gui);

    const image = useSelector(state => state.tree.images.byId[imageId]);

    const isUndoAvailable = isScreenRevertable({gui: isGui, image: image, isLastResult, isStaticImageAccepterEnabled});
    const isAcceptAvailable = isAcceptable(image);
    const isEditScreensAvailable = useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === EditScreensFeature.name);

    const isAcceptEnabled = isFocused && Boolean(isEditScreensAvailable) && isAcceptAvailable && !isRunning && !isProcessing;
    const isUndoEnabled = isFocused && Boolean(isEditScreensAvailable) && isUndoAvailable && !isRunning && !isProcessing;

    const onScreenshotAccept: MouseEventHandler = useCallback((e): void => {
        e?.stopPropagation();
        analytics?.trackScreenshotsAccept();

        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterStageScreenshot([imageId]));
        } else {
            dispatch(thunkAcceptImages({imageIds: [imageId]}));
        }
        if (onAccept) {
            onAccept(imageId);
        }
    }, [analytics, isStaticImageAccepterEnabled, dispatch, imageId]);

    const onScreenshotUndo: MouseEventHandler = useCallback((e): void => {
        e?.stopPropagation();

        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterUnstageScreenshot([imageId]));
        } else {
            dispatch(thunkRevertImages({imageIds: [imageId]}));
        }
    }, [isStaticImageAccepterEnabled, dispatch, imageId]);

    useHotkey('a', onScreenshotAccept as () => void, {enabled: isAcceptEnabled});
    useHotkey('u', onScreenshotUndo as () => void, {enabled: isUndoEnabled});

    if (page === Page.visualChecksPage) {
        useHotkey('enter', onScreenshotAccept as () => void, {enabled: isAcceptEnabled});
        useHotkey(' ', onScreenshotUndo as () => void, {enabled: isUndoEnabled});
    }

    if (!isEditScreensAvailable) {
        return null;
    }

    if (isUndoAvailable) {
        return (
            <Button
                view={view}
                className={classnames(styles.acceptButton, className)}
                disabled={isRunning || isProcessing}
                onClick={onScreenshotUndo}
                qa="undo-button"
            >
                <Icon data={ArrowUturnCcwLeft}/>Undo<Hotkey className={isFocused ? styles.hotkey : styles.hotkeyHidden} view={view === 'action' ? 'dark' : 'light'} value="u" />
            </Button>
        );
    }

    if (isAcceptAvailable) {
        return (
            <Button
                view={view}
                className={classnames(styles.acceptButton, className)}
                disabled={isRunning || isProcessing}
                onClick={onScreenshotAccept}
            >
                <Icon data={Check}/>Accept<Hotkey className={isFocused ? styles.hotkey : styles.hotkeyHidden} view={view === 'action' ? 'dark' : 'light'} value="a" />
            </Button>
        );
    }

    return null;
};
