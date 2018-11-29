import React from 'react';
import {Loader} from 'semantic-ui-react';
import 'semantic-ui-css/components/loader.css';

export default function Placeholder({width, paddingTop}) {
    return (
        <div className="image-box__placeholder" style={{width, paddingTop}}>
            <Loader active content='Loading' />
        </div>
    );
}
