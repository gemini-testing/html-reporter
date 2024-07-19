import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Label} from '@gravity-ui/uikit';
import {isEmpty} from 'lodash';
import {version} from '../../../../package.json';

class ReportInfo extends Component {
    render() {
        const {gui, timestamp} = this.props;
        const lang = isEmpty(navigator.languages) ? navigator.language : navigator.languages[0];
        const date = new Date(timestamp).toLocaleString(lang);

        return (
            <div className="report-info">
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
}

export default connect(
    ({gui, timestamp}) => ({gui, timestamp})
)(ReportInfo);
