import React, {KeyboardEvent, useEffect, useMemo, useRef, useState} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {pick} from 'lodash';
import {Button, Card, Link, Text, TextArea} from '@gravity-ui/uikit';

import * as actions from '../../../modules/actions';
import type {CommitResult} from '../../../modules/actions/static-accepter';
import type defaultState from '../../../modules/default-state';
import {formatCommitPayload} from '../../../modules/static-image-accepter';
import {
    isStaticAccepterPopupBlockedError,
    preloadStaticAccepter
} from '../../../modules/static-accepter-v2';
import {getErrorMessage} from '../../../modules/utils';

import './style.css';

interface Props {
    toolName: typeof defaultState['apiValues']['toolName'];
    staticImageAccepter: typeof defaultState['staticImageAccepter'];
    staticAccepterConfig: typeof defaultState['config']['staticImageAccepter'];
    imagesById: typeof defaultState['tree']['images']['byId'];
    processing: typeof defaultState['processing'];
    actions: typeof actions;
}

type ModulePreloadStatus = 'idle' | 'loading' | 'ready' | 'error';

const StaticAccepterConfirm: React.FC<Props> = ({toolName, staticImageAccepter, staticAccepterConfig, imagesById, processing, actions}) => {
    const defaultCommitMessage = `chore: update ${toolName} screenshot references`;
    const pullRequestUrl = staticAccepterConfig.pullRequestUrl;
    const moduleUrl = staticAccepterConfig.moduleUrl;
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [modulePreloadStatus, setModulePreloadStatus] = useState<ModulePreloadStatus>('idle');
    const [modulePreloadError, setModulePreloadError] = useState<string | null>(null);
    const [operationError, setOperationError] = useState<{message: string; isPopupBlocked: boolean} | null>(null);

    useEffect(() => {
        textAreaRef.current?.setSelectionRange?.(-1, -1);

        if (!moduleUrl) {
            return;
        }

        let isCurrent = true;

        setModulePreloadStatus('loading');
        setModulePreloadError(null);
        preloadStaticAccepter(moduleUrl).then(
            () => {
                if (isCurrent) {
                    setModulePreloadStatus('ready');
                }
            },
            (error) => {
                if (isCurrent) {
                    setModulePreloadStatus('error');
                    setModulePreloadError(getErrorMessage(error));
                }
            }
        );

        return () => {
            isCurrent = false;
        };
    }, [moduleUrl]);

    const imagesInfo = useMemo(() => formatCommitPayload(
        Object.values(staticImageAccepter.acceptableImages),
        imagesById,
        staticImageAccepter.accepterDelayedImages
    ), [staticImageAccepter, imagesById]);

    const onClose = (): void => {
        if (processing) {
            return;
        }

        actions.staticAccepterCloseConfirm();
    };

    const onConfirm = (): void => {
        if (processing || (moduleUrl && modulePreloadStatus !== 'ready')) {
            return;
        }

        setOperationError(null);
        const message = textAreaRef.current?.value || defaultCommitMessage;
        const opts = {
            ...pick(staticAccepterConfig, [
                'repositoryUrl',
                'pullRequestUrl',
                'serviceUrl',
                'moduleUrl',
                'axiosRequestOptions',
                'meta'
            ]),
            message
        };

        // The bound v2 thunk calls static accepter synchronously here, before this handler yields.
        const operation = actions.staticAccepterCommitScreenshot(imagesInfo, opts) as unknown as Promise<CommitResult>;

        if (moduleUrl) {
            operation.then((result) => {
                if (result.error) {
                    setOperationError({
                        message: getErrorMessage(result.error),
                        isPopupBlocked: isStaticAccepterPopupBlockedError(result.error)
                    });
                }
            }, (error) => setOperationError({
                message: getErrorMessage(error),
                isPopupBlocked: isStaticAccepterPopupBlockedError(error)
            }));
        }
    };

    const onModulePreloadRetry = (): void => {
        if (!moduleUrl) {
            return;
        }

        setModulePreloadStatus('loading');
        setModulePreloadError(null);
        preloadStaticAccepter(moduleUrl).then(
            () => setModulePreloadStatus('ready'),
            (error) => {
                setModulePreloadStatus('error');
                setModulePreloadError(getErrorMessage(error));
            }
        );
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
                disabled={processing}
            />
            {moduleUrl && modulePreloadStatus === 'loading' &&
                <div className='static-accepter-confirm__status'>Loading Static Accepter…</div>}
            {moduleUrl && modulePreloadStatus === 'error' &&
                <div className='static-accepter-confirm__error' role='alert'>
                    <div>Failed to load Static Accepter: {modulePreloadError}</div>
                    <Button view='flat' onClick={onModulePreloadRetry}>Retry loading</Button>
                </div>}
            {operationError &&
                <div className='static-accepter-confirm__error' role='alert'>
                    <div>{operationError.message}</div>
                    {operationError.isPopupBlocked &&
                        <div>Allow popups for this report and press Commit again.</div>}
                </div>}
            <div className='static-accepter-confirm__controls'>
                <Button
                    className='static-accepter-confirm__cancel'
                    onClick={onClose}
                    disabled={processing}
                >
                    Cancel
                </Button>
                <Button
                    view='action'
                    className='static-accepter-confirm__confirm'
                    onClick={onConfirm}
                    disabled={processing || (Boolean(moduleUrl) && modulePreloadStatus !== 'ready')}
                    loading={processing || modulePreloadStatus === 'loading'}
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
        const processing = state.processing;

        return {
            toolName,
            staticImageAccepter,
            staticAccepterConfig,
            imagesById,
            processing
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(StaticAccepterConfirm);
