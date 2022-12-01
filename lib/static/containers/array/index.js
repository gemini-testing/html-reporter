import React, {useLayoutEffect, useRef, useState} from 'react';
import {get} from 'lodash';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import './array.styl';

const ArrayContainer = (props, ref) => {
    const {elements, placeholder, ...rest} = props;

    const containerRef = useRef(null);
    const [hiddenItemsAmount, setHiddenItemsAmount] = useState(0);
    const hiddenAmountClassNames = classNames('array__item', {'array__item_hidden': !hiddenItemsAmount});

    useLayoutEffect(() => {
        const ammount = countHiddenItems();

        setHiddenItemsAmount(ammount);
    }, [elements]);

    function countHiddenItems() {
        if (!get(containerRef, 'current.children.length', 0)) {
            return 0;
        }

        const children = [...containerRef.current.children];
        const showingItemTopOffset = children[0].offsetTop;
        const hiddenElementIndex = children.findIndex(el => el.offsetTop > showingItemTopOffset);

        return hiddenElementIndex === -1
            ? 0
            : children.length - hiddenElementIndex;
    }

    return (
        <div ref={ref} className='array' {...rest}>
            <div ref={containerRef} className='array__container'>
                {elements.length
                    ? elements.map((element, ind) => (
                        <div key={ind} className='array__item'>
                            {element}
                        </div>
                    ))
                    : <span className='array__placeholder'>{placeholder}</span>
                }
            </div>
            <div className={hiddenAmountClassNames}>
                + {hiddenItemsAmount}
            </div>
        </div>
    );
};

const ForwardedArrayContainer = React.forwardRef(ArrayContainer);

ForwardedArrayContainer.propTypes = {
    elements: PropTypes.arrayOf(PropTypes.string).isRequired,
    placeholder: PropTypes.node
};

export default ForwardedArrayContainer;
