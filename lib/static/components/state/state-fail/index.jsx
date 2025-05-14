'use strict';

import {TabList, TabProvider, Tab} from '@gravity-ui/uikit';
import PropTypes from 'prop-types';
import React, {Fragment, useEffect, useState} from 'react';
import {connect} from 'react-redux';

import {DiffModes} from '@/constants';
import {SwitchMode} from '@/static/new-ui/components/DiffViewer/SwitchMode';
import {SwipeMode} from '@/static/new-ui/components/DiffViewer/SwipeMode';
import {OnionSkinMode} from '@/static/new-ui/components/DiffViewer/OnionSkinMode';
import {OnlyDiffMode} from '@/static/new-ui/components/DiffViewer/OnlyDiffMode';
import {SideBySideToFitMode} from '@/static/new-ui/components/DiffViewer/SideBySideToFitMode';
import {SideBySideMode} from '@/static/new-ui/components/DiffViewer/SideBySideMode';
import {ListMode} from '@/static/new-ui/components/DiffViewer/ListMode';
import './index.styl';
import {types} from '../../modals';

const StateFail = ({image, diffMode: diffModeProp, isScreenshotAccepterOpened}) => {
    const [diffMode, setDiffMode] = useState(diffModeProp);

    useEffect(() => {
        setDiffMode(diffModeProp);
    }, [diffModeProp, setDiffMode]);

    const renderDiffModeItems = () => {
        return (
            <div className="diff-modes">
                <TabProvider value={diffMode} onUpdate={setDiffMode}>
                    <TabList size='m'>
                        {Object.values(DiffModes).map(mode => (
                            <Tab key={mode.id} value={mode.id}>
                                {mode.label}
                            </Tab>
                        ))}
                    </TabList>
                </TabProvider>
            </div>
        );
    };

    const getImageLabel = (text, image) => {
        if (isScreenshotAccepterOpened) {
            return null;
        }

        return <div className="image-box__title">{`${text} (${image.size.width}x${image.size.height})`}</div>;
    };

    const renderImages = () => {
        const expectedImg = Object.assign({}, image.expectedImg, {
            label: getImageLabel('Expected', image.expectedImg)
        });
        const actualImg = Object.assign({}, image.actualImg, {
            label: getImageLabel('Actual', image.actualImg)
        });
        const diffImg = Object.assign({}, image.diffImg, {
            label: getImageLabel('Diff', image.diffImg),
            diffClusters: image.diffClusters
        });

        switch (diffMode) {
            case DiffModes.ONLY_DIFF.id:
                return <OnlyDiffMode diff={diffImg} />;

            case DiffModes.SWITCH.id:
                return <SwitchMode expected={expectedImg} actual={actualImg} />;

            case DiffModes.SWIPE.id:
                return <SwipeMode expected={expectedImg} actual={actualImg} />;

            case DiffModes.ONION_SKIN.id:
                return <OnionSkinMode expected={expectedImg} actual={actualImg} />;

            case DiffModes.THREE_UP_SCALED.id:
                return <SideBySideMode expected={expectedImg} actual={actualImg} diff={diffImg} />;

            case DiffModes.THREE_UP_SCALED_TO_FIT.id: {
                // In screenshot accepter we want images to fit .image-box__container height by making it container-type: size and specifying 100cqh.
                // In regular view we want images to fit viewport minus approximate header and accept buttons height.
                const desiredHeight = isScreenshotAccepterOpened ? '100cqh' : 'calc(100vh - 180px)';

                return <SideBySideToFitMode desiredHeight={desiredHeight} expected={expectedImg} actual={actualImg} diff={diffImg} />;
            }
            case DiffModes.THREE_UP.id:
            default:
                return <ListMode expected={expectedImg} actual={actualImg} diff={diffImg} />;
        }
    };

    return (
        <Fragment>
            {!isScreenshotAccepterOpened && renderDiffModeItems()}
            {renderImages()}
        </Fragment>
    );
};

StateFail.propTypes = {
    image: PropTypes.shape({
        expectedImg: PropTypes.object.isRequired,
        actualImg: PropTypes.object.isRequired,
        diffImg: PropTypes.object.isRequired,
        diffClusters: PropTypes.array,
        size: PropTypes.shape({
            width: PropTypes.number,
            height: PropTypes.number
        })
    }).isRequired,
    // from store
    diffMode: PropTypes.string,
    isScreenshotAccepterOpened: PropTypes.bool.isRequired
};

export default connect(
    ({modals, view}) => {
        const diffMode = view.diffMode;
        const isScreenshotAccepterOpened = modals.some(modal => modal.id === types.SCREENSHOT_ACCEPTER);

        return {diffMode, isScreenshotAccepterOpened};
    }
)(StateFail);
