import {Card} from '@gravity-ui/uikit';
import PropTypes from 'prop-types';
import React, {Component} from 'react';

import {MetaInfo as MetaInfoContent} from '@/static/new-ui/components/MetaInfo';
import Details from '../../../details';

export default class MetaInfo extends Component {
    static propTypes = {resultId: PropTypes.string.isRequired};

    render() {
        const {resultId} = this.props;

        return <Details
            title='Meta'
            content={<Card className='details__card' view='filled'><MetaInfoContent resultId={resultId} qa={'meta-info'}/></Card>}
        />;
    }
}
