'use strict';

import url from 'url';
import React, {Component} from 'react';
import {connect} from 'react-redux';

interface ISectionBrowserTitleChildProps extends React.Props<any>{
    name: string;
    result: any;
    handler: () => any;
    parsedHost: string;
}

class SectionBrowserTitle extends Component<ISectionBrowserTitleChildProps> {
    render() {
        const {name, result, handler, parsedHost} = this.props;

        return (
            <div className='section__title' onClick={handler}>
                {name}
                <a
                    className='button section__icon section__icon_view-local'
                    href={this._buildUrl(result.suiteUrl, parsedHost)}
                    onClick={(e) => {
                        return e.stopPropagation();
                    }}
                    title='view in browser'
                    target='_blank'>
                </a>
            </div>
        );
    }

    private _buildUrl(href: string, host: string) {
        return !host ? href : url.format({...url.parse(href), host});
    }
}

export default connect(
    (state: any) => ({parsedHost: state.view.parsedHost}),
    null
)(SectionBrowserTitle);
