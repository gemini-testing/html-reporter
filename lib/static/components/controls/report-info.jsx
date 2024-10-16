import {Flask} from '@gravity-ui/icons';
import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {Button, Icon, Label} from '@gravity-ui/uikit';
import {isEmpty} from 'lodash';
import {version} from '../../../../package.json';
import useLocalStorage from '@/static/hooks/useLocalStorage';
import {LocalStorageKey, UiMode} from '@/constants/local-storage';

function ReportInfo(props) {
    const {gui, timestamp} = props;
    const lang = isEmpty(navigator.languages) ? navigator.language : navigator.languages[0];
    const date = new Date(timestamp).toLocaleString(lang);

    const [, setUiMode] = useLocalStorage(LocalStorageKey.UIMode, UiMode.New);

    const onNewUiButtonClick = () => {
        setUiMode(UiMode.New);

        window.location.pathname = window.location.pathname.replace(/\/(index\.html)?$/, (match, ending) => ending ? '/new-ui.html' : '/new-ui');
    };

    return (
        <div className="report-info">
            <Button className={'new-ui-button'} onClick={onNewUiButtonClick}><div className='new-ui-button__glow'></div><Icon data={Flask}/>Try New UI</Button>
            <Label qa='version-label' size='m' className='label'>
                Version
                <div className='detail'>{version}</div>
            </Label>
            {!gui && <Label qa='created-at-label' size='m' className='label'>
                Created at
                <div className='detail'>{date}</div>
            </Label>}
        </div>
    );
}

ReportInfo.propTypes = {
    gui: PropTypes.bool.isRequired,
    timestamp: PropTypes.number.isRequired
};

export default connect(
    ({gui, timestamp}) => ({gui, timestamp})
)(ReportInfo);
