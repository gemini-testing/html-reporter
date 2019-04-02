'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

import ErrorGroupsItem from './item';

class ErrorGroupsList extends Component {
  static propTypes = {
      groupedErrors: PropTypes.array.isRequired
  };

  render() {
      const {groupedErrors} = this.props;

      return groupedErrors.length === 0
          ? <div>There is no test failure to be displayed.</div>
          : (
              <div className="groupedErrors">
                  {groupedErrors.map(group => {
                      return <ErrorGroupsItem key={group.name} group={group} />;
                  })}
              </div>
          );
  }
}

export default connect(({groupedErrors}) => ({groupedErrors}))(ErrorGroupsList);
