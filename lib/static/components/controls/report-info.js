import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Label} from 'semantic-ui-react';
import {version} from '../../../../package.json';

class ReportInfo extends Component {
    render() {
        const {gui, date} = this.props;

        return (
            <div className="report-info">
                <Label className="control-label">
                    Version
                    <Label.Detail>
                        {version}
                    </Label.Detail>
                </Label>
                {!gui && <Label className="control-label">
                    Created at
                    <Label.Detail>
                        {date}
                    </Label.Detail>
                </Label>}
            </div>
        );
    }
}

export default connect(
    ({gui, date}) => ({gui, date})
)(ReportInfo);
