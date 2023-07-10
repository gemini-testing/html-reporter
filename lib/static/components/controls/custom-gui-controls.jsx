'use strict';

import React, {PureComponent} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {isEmpty, map} from 'lodash';
import {Button} from 'semantic-ui-react';

import * as actions from '../../modules/actions';

class CustomGuiControls extends PureComponent {
    _renderButtons(opts) {
        const {sectionName, groupIndex, controls} = opts;
        const {actions} = this.props;

        const onClickHandler = (event, {value}) => {
            const controlIndex = controls.findIndex((control) => control.value === value);

            actions.runCustomGuiAction({sectionName, groupIndex, controlIndex});
        };

        return map(controls, ({label, value, active}, i) =>
            <Button
                onClick={onClickHandler}
                key={`${i}`}
                value={value}
                content={label}
                active={Boolean(active)}
            />
        );
    }

    _renderControls(type, opts) {
        switch (type) {
            case 'button': {
                return this._renderButtons(opts);
            }
            case 'radiobutton': {
                return <Button.Group key={opts.sectionName}>{this._renderButtons(opts)}</Button.Group>;
            }
            default: {
                return null;
            }
        }
    }

    _renderSection(sectionName) {
        return this.props.customGui[sectionName]
            .map(({type, controls}, groupIndex) => this._renderControls(type, {sectionName, groupIndex, controls}))
            .filter(Boolean)
            .map((s) => <div className="custom-gui_section-controls" key={sectionName}>{s}</div>);
    }

    render() {
        const {customGui} = this.props;

        const customGuiControls = Object.keys(customGui)
            .map((sectionName) => this._renderSection(sectionName))
            .filter((c) => !isEmpty(c));

        return !isEmpty(customGuiControls)
            ? <div className="custom-gui">{customGuiControls}</div>
            : null;
    }
}

export default connect(
    (state) => ({customGui: state.config.customGui}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(CustomGuiControls);
