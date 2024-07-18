import React, {KeyboardEvent, useEffect, useMemo, useRef} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {pick} from 'lodash';
import {Button, Card, Link, Text, TextArea} from '@gravity-ui/uikit';

import * as actions from '../../../modules/actions';
import type defaultState from '../../../modules/default-state';
import {formatCommitPayload} from '../../../modules/static-image-accepter';

import './style.css';

interface Props {
    toolName: typeof defaultState['apiValues']['toolName'];
    staticImageAccepter: typeof defaultState['staticImageAccepter'];
    staticAccepterConfig: typeof defaultState['config']['staticImageAccepter'];
    imagesById: typeof defaultState['tree']['images']['byId'];
    actions: typeof actions;
}

const StaticAccepterConfirm: React.FC<Props> = ({toolName, staticImageAccepter, staticAccepterConfig, imagesById, actions}) => {
    const defaultCommitMessage = `chore: update ${toolName} screenshot references`;
    const pullRequestUrl = staticAccepterConfig.pullRequestUrl;
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textAreaRef.current?.setSelectionRange?.(-1, -1);
    }, []);

    const imagesInfo = useMemo(() => formatCommitPayload(
        Object.values(staticImageAccepter.acceptableImages),
        imagesById,
        staticImageAccepter.accepterDelayedImages
    ), [staticImageAccepter, imagesById]);

    const onClose = (): void => {
        actions.staticAccepterCloseConfirm();
    };

    const onConfirm = async (): Promise<void> => {
        const message = textAreaRef.current?.value || defaultCommitMessage;
        const opts = {
            ...pick(staticAccepterConfig, [
                'repositoryUrl',
                'pullRequestUrl',
                'serviceUrl',
                'axiosRequestOptions',
                'meta'
            ]),
            message
        };

        await actions.staticAccepterCommitScreenshot(imagesInfo, opts);
    };

    const onKeyPress = (event: KeyboardEvent): void => {
        if (event.key === 'Enter') {
            event.preventDefault();

            onConfirm();
        }
    };

    return (
        <Card className='static-accepter-confirm' theme='info' type='action' view='outlined'>
            <Text>You are commiting {imagesInfo.length} images to Pull Request:</Text>
            <br />
            <Link href={pullRequestUrl} target='_blank'>{pullRequestUrl}</Link>
            <br />
            <br />
            <br />
            <Text>Enter commit message:</Text>
            <TextArea
                autoFocus
                defaultValue={defaultCommitMessage}
                controlRef={textAreaRef}
                onKeyPress={onKeyPress}
            />
            <div className='static-accepter-confirm__controls'>
                <Button
                    className='static-accepter-confirm__cancel'
                    onClick={onClose}
                >
                    Cancel
                </Button>
                <Button
                    view='action'
                    className='static-accepter-confirm__confirm'
                    onClick={onConfirm}
                >
                    Commit
                </Button>
            </div>
        </Card>
    );
};

export default connect(
    (state: typeof defaultState): Omit<Props, 'actions'> => {
        const toolName = state.apiValues.toolName;
        const staticImageAccepter = state.staticImageAccepter;
        const staticAccepterConfig = state.config.staticImageAccepter;
        const imagesById = state.tree.images.byId;

        return {
            toolName,
            staticImageAccepter,
            staticAccepterConfig,
            imagesById
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(StaticAccepterConfirm);
