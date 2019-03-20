'use strict';

import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {Modal as SemanticModal, Button} from 'semantic-ui-react';
import 'semantic-ui-css/components/modal.min.css';
import 'semantic-ui-css/components/button.min.css';

export default class ModalSameDiffs extends Component {
    static propTypes = {
        onCancel: PropTypes.func.isRequired,
        browserId: PropTypes.string.isRequired,
        equalImages: PropTypes.number.isRequired,
        comparedImages: PropTypes.number.isRequired
    }

    render() {
        const {onCancel, browserId, equalImages, comparedImages} = this.props;

        return (
            <SemanticModal size="small" open={true} onClose={onCancel}>
                <SemanticModal.Header content="Find same diffs result" />
                <SemanticModal.Content scrolling>
                    <p>Search was carried out in: <b>{browserId}</b></p>
                    <p>Found <b>{equalImages}</b> equal images from <b>{comparedImages}</b></p>
                </SemanticModal.Content>
                <SemanticModal.Actions>
                    <Button
                        onClick={onCancel}
                        content="Got it"
                        size="small"
                        positive
                    />
                </SemanticModal.Actions>
            </SemanticModal>
        );
    }
}
