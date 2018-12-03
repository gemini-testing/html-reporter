'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import {retrySuite} from '../../../modules/actions';
const CopyToClipboard = require('react-copy-to-clipboard');

interface ISectionTitleProp extends React.Props<any>{
    name: string;
    suite: {
        suitePath: any[]
    };
    handler: (...args: any[]) => any;
    gui?: boolean;
    retrySuite?: any;
}

class SectionTitle extends Component<ISectionTitleProp> {

    constructor(props: ISectionTitleProp){
        super(props);

        this.onSuiteRetry.bind(this);
        this._drawCopyButton.bind(this);
        this._drawRetryButton.bind(this);
    }

    onSuiteRetry(e: React.MouseEvent<HTMLButtonElement>) {
        e.stopPropagation();
        this.props.retrySuite(this.props.suite);
    }

    render() {
        const {name, handler, gui} = this.props;

        return (
            <div className='section__title' onClick={handler}>
                {name}
                {this._drawCopyButton()}
                {gui && this._drawRetryButton()}
            </div>
        );
    }

   private _drawCopyButton() {
        return (
            <CopyToClipboard className='button section__icon section__icon_copy-to-clipboard'
                text={this.props.suite.suitePath.join(' ')}
                             onCopy={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}>
                <button></button>
            </CopyToClipboard>
        );
    }

    private _drawRetryButton() {
        return (
            <button
                className='button section__icon section__icon_retry'
                title='retry suite'
                onClick={this.onSuiteRetry}>
            </button>
        );
    }
}

export default connect<{}, {}, ISectionTitleProp>(({gui}: any) => ({gui}), {retrySuite})(SectionTitle);
