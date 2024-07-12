import React, {Component} from 'react';
import {connect} from 'react-redux';
import {version} from '../../../../package.json';
import { Label } from '@gravity-ui/uikit';

class ReportInfo extends Component {
    render() {
        const {gui, date} = this.props;

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
    ({gui, date}) => ({gui, date})
)(ReportInfo);
