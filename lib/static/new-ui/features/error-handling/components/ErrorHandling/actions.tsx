import {ArrowsRotateLeft} from '@gravity-ui/icons';
import {Button, Icon} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import GithubIcon from '../../../../../icons/github-icon.svg';
import {NEW_ISSUE_LINK} from '@/constants';

function reportIssue(): void {
    window.open(NEW_ISSUE_LINK, '_blank');
}

export function FileIssue(): ReactNode {
    return <Button view="outlined" onClick={reportIssue}>
        <img src={GithubIcon} alt="icon" />
        File an issue
    </Button>;
}

function reloadPage(): void {
    window.location.reload();
}

export function ReloadPage(): ReactNode {
    return <Button view="outlined" onClick={reloadPage}>
        <Icon data={ArrowsRotateLeft} />
        Refresh this page
    </Button>;
}
