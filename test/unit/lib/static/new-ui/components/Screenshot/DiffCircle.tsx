import {render, waitFor} from '@testing-library/react';
import {expect} from 'chai';
import React, {createRef} from 'react';

import styles from '@/static/new-ui/components/Screenshot/DiffCircle.module.css';
import {DiffCircle, DiffCircleHandle} from '@/static/new-ui/components/Screenshot/DiffCircle';

const makeImageElement = (): HTMLElement => {
    const diffImageElement = {offsetWidth: 1000} as HTMLElement;
    diffImageElement.getBoundingClientRect = (): DOMRect => ({
        top: 0,
        left: 0,
        width: 1000,
        height: 500,
        x: 0,
        y: 0
    } as DOMRect);

    return diffImageElement;
};

describe('<DiffCircle />', () => {
    const diffImageOriginalSize = {width: 1000, height: 500};
    const diffCluster = {left: 100, top: 50, right: 200, bottom: 150};
    let diffImageRef: React.MutableRefObject<HTMLElement | null>;

    beforeEach(() => {
        diffImageRef = createRef();
    });

    it('should render when pulse is called', async () => {
        const ref: React.RefObject<DiffCircleHandle> = createRef();
        diffImageRef.current = makeImageElement();
        const {container} = render(<DiffCircle ref={ref} diffImageOriginalSize={diffImageOriginalSize} diffImageRef={diffImageRef} diffCluster={diffCluster} />);

        ref.current?.pulse();

        await waitFor(() => {
            const diffCircleElement = container.querySelector(`.${styles.diffCircle}`);

            expect(diffCircleElement).not.to.be.null;
        });
    });

    it('should render at correct coords', async () => {
        const ref: React.RefObject<DiffCircleHandle> = createRef();
        const {container} = render(<DiffCircle ref={ref} diffImageOriginalSize={diffImageOriginalSize} diffImageRef={diffImageRef} diffCluster={diffCluster} />);
        diffImageRef.current = makeImageElement();

        ref.current?.pulse();

        await waitFor(() => {
            const diffCircleElement = container.querySelector(`.${styles.diffCircle}`) as HTMLDivElement;

            expect(diffCircleElement).to.not.be.null;
            expect(diffCircleElement?.style.width).to.equal('142px');
            expect(diffCircleElement?.style.height).to.equal('142px');
            expect(diffCircleElement?.style.top).to.equal('29px');
            expect(diffCircleElement?.style.left).to.equal('79px');
        });
    });
});
