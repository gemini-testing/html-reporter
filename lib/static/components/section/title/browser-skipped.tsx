'use strict';

import React, {Component} from 'react';
const Parser = require('html-react-parser');

interface ISectionBrowserTitleSkippedProp extends React.Props<any>{
    result: {
        name: string,
        reason?: string
    };
}

class SectionBrowserTitleSkipped extends Component<ISectionBrowserTitleSkippedProp> {
    render() {
        const {name, reason} = this.props.result;

        return (
            <div className='section__title section__title_skipped'>
                [skipped] {name}
                {reason && ', reason: '}
                {reason && Parser(reason)}
            </div>
        );
    }
}

export default SectionBrowserTitleSkipped;
