import React, {ReactNode, useMemo, useEffect} from 'react';
import {useSelector} from 'react-redux';
import {ViewportContext, useSyncedViewport} from '../hooks/useSyncedViewport';
import {InteractiveScreenshot} from './InteractiveScreenshot';
import {InteractiveFitMode} from './constants';
import styles from './index.module.css';
import {ImageLabel} from '../../ImageLabel';
import {getImageDisplayedSize} from '../../../utils';
import {ImageFile} from '@/types';
import {getDisplayedDiffPercentValue, getDisplayedDiffPixelsCountValue} from '../utils';
import {TwoUpFitMode} from '@/constants';

interface TwoUpInteractiveModeProps {
    expected: ImageFile;
    actual: ImageFile;
    diff?: ImageFile;
    differentPixels?: number;
    diffRatio?: number;
}

interface TwoUpInteractiveModePureProps extends TwoUpInteractiveModeProps {
    is2UpDiffVisible: boolean;
    globalTwoUpFitMode: TwoUpFitMode;
}

export function TwoUpInteractiveModePure(props: TwoUpInteractiveModePureProps): ReactNode {
    const viewportContextValue = useSyncedViewport();

    const defaultFitMode = props.globalTwoUpFitMode === TwoUpFitMode.FitToView
        ? InteractiveFitMode.FitView
        : InteractiveFitMode.FitWidth;

    const diffInfo = props.differentPixels && props.diffRatio
        ? ` ⋅ ${getDisplayedDiffPixelsCountValue(props.differentPixels)} ${props.differentPixels > 1 ? 'are' : 'is'} different (${getDisplayedDiffPercentValue(props.diffRatio)}%)`
        : '';
    const actualImageSubtitle = getImageDisplayedSize(props.actual) + diffInfo;

    const unifiedDimensions = useMemo(() => {
        return {
            width: Math.max(props.expected.size.width, props.actual.size.width),
            height: Math.max(props.expected.size.height, props.actual.size.height)
        };
    }, [props.expected.size, props.actual.size]);

    useEffect(() => {
        if (props.globalTwoUpFitMode === TwoUpFitMode.FitToView) {
            viewportContextValue.setFitMode(InteractiveFitMode.FitView);
        } else if (props.globalTwoUpFitMode === TwoUpFitMode.FitToWidth) {
            viewportContextValue.setFitMode(InteractiveFitMode.FitWidth);
        }
        viewportContextValue.updateViewport({
            scale: 1,
            translateX: 0,
            translateY: 0
        });
    }, [props.globalTwoUpFitMode]);

    return (
        <ViewportContext.Provider value={viewportContextValue}>
            <div className={styles.twoUpInteractiveMode} data-testid="two-up-interactive-mode">
                <div className={styles.sideContainer}>
                    <ImageLabel title={'Expected'} subtitle={getImageDisplayedSize(props.expected)} />
                    <div className={styles.imagePanel} data-testid="image-panel-expected">
                        <InteractiveScreenshot
                            image={props.expected}
                            unifiedDimensions={unifiedDimensions}
                            containerClassName={styles.imageContainer}
                            defaultFitMode={defaultFitMode}
                        />
                    </div>
                </div>
                <div className={styles.divider} />
                <div className={styles.sideContainer}>
                    <ImageLabel title={'Actual'} subtitle={actualImageSubtitle} />
                    <div className={styles.imagePanel} data-testid="image-panel-actual">
                        <InteractiveScreenshot
                            image={props.actual}
                            unifiedDimensions={unifiedDimensions}
                            containerClassName={styles.imageContainer}
                            overlayImage={props.diff}
                            showOverlay={props.is2UpDiffVisible}
                            defaultFitMode={defaultFitMode}
                        />
                    </div>
                </div>
            </div>
        </ViewportContext.Provider>
    );
}

export function TwoUpInteractiveMode(props: TwoUpInteractiveModeProps): ReactNode {
    const is2UpDiffVisible = useSelector(state => state.ui.visualChecksPage.is2UpDiffVisible);
    const globalTwoUpFitMode = useSelector(state => state.ui.visualChecksPage.twoUpFitMode);

    return (
        <TwoUpInteractiveModePure
            {...props}
            is2UpDiffVisible={is2UpDiffVisible}
            globalTwoUpFitMode={globalTwoUpFitMode}
        />
    );
}
