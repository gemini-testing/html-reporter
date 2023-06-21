import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {Modal as SemanticModal, Button} from 'semantic-ui-react';

export default class ModalSameDiffs extends Component {
    static propTypes = {
        onClose: PropTypes.func.isRequired,
        browserId: PropTypes.string.isRequired,
        equalImages: PropTypes.number.isRequired,
        comparedImages: PropTypes.number.isRequired
    }

    render() {
        const {onClose, browserId, equalImages, comparedImages} = this.props;

        return (
            <SemanticModal size="small" open={true} onClose={onClose}>
                <SemanticModal.Header content="Find same diffs result" />
                <SemanticModal.Content scrolling>
                    <p>Search was carried out in: <b>{browserId}</b></p>
                    <p>Found <b>{equalImages}</b> equal images from <b>{comparedImages}</b></p>
                </SemanticModal.Content>
                <SemanticModal.Actions>
                    <Button
                        onClick={onClose}
                        content="Got it"
                        size="small"
                        positive
                    />
                </SemanticModal.Actions>
            </SemanticModal>
        );
    }
}
