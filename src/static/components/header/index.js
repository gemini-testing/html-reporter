'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import Summary from './summary';

import './header.css';

class Header extends Component {
    static propTypes = {
        date: PropTypes.string
    };

    render() {
        return (
            <header className="header container">
                <Summary />
            </header>
        );
    }
}

export default connect((state) => {
    return {date: state.date};
})(Header);
