import {ArrowsRotateLeft} from '@gravity-ui/icons';
import {Button, ButtonProps, Icon} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import GithubIcon from '../../../../../icons/github-icon.svg';
import {NEW_ISSUE_LINK} from '@/constants';

type ActionProps = Omit<ButtonProps, 'view' | 'onClick'>;

function reportIssue(): void {
    window.open(NEW_ISSUE_LINK, '_blank');
}

export function FileIssue(props: ActionProps): ReactNode {
    return <Button {...props} view="outlined" onClick={reportIssue}>
        <span className="g-button__icon g-button__icon_side_start">
            <span className="g-button__icon-inner">
                <img src={GithubIcon} alt="icon" />
            </span>
        </span>

        File an issue
    </Button>;
}

function reloadPage(): void {
    window.location.reload();
}

export function ReloadPage(props: ActionProps): ReactNode {
    return <Button {...props} view="outlined" onClick={reloadPage}>
        <Icon data={ArrowsRotateLeft} />
        Refresh this page
    </Button>;
}
