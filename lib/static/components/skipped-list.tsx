import React, {Component} from 'react';
import classNames from 'classnames';
import {connect} from 'react-redux';

const Parser = require('html-react-parser');

interface ISkippedListProps extends React.Props<any> {
    showSkipped: boolean;
    skips: [];
}

class SkippedList extends Component<ISkippedListProps> {

    render() {
        const {showSkipped, skips} = this.props;
        const collapsed = !showSkipped;
        const className = classNames('skipped__list', {collapsed});

        const skipsTmpl = skips.length > 0
            ? this._drawSkips(skips)
            : 'There are no skipped tests';

        return (<div className={className}>{skipsTmpl}</div>);
    }

    _drawSkips(skips: []) {
        return skips.map((skip, index) => {
            const {browser, comment, suite}: any = skip;
            return (
                <div key={index}>
                    {suite} > {browser}
                    {comment && ' reason: '}
                    {comment && Parser(comment)}
                </div>
            );
        });
    }
}

export default connect(
    (state: any) => ({
        showSkipped: state.view.showSkipped,
        skips: state.skips
    })
)(SkippedList);
