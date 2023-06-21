import React from 'react';
import Label from '../../../../../../../src/static/components/controls/browser-list/label';

describe('<Label />', () => {
    const sandbox = sinon.sandbox.create();

    let setSelected;

    beforeEach(() => {
        setSelected = sandbox.stub();
    });

    afterEach(() => sandbox.restore());

    function mkProps_(opts) {
        const browserId = opts.browserId || 'bro1';
        const isLeaf = opts.isLeaf !== undefined && opts.isLeaf;
        const version = opts.isLeaf !== false && (opts.version || 'v1');
        const id = isLeaf ? `${browserId} (${version})` : browserId;
        const treeDataMap = opts.treeDataMap || {[id]: {browserId, version, isLeaf}};
        const elements = opts.elements || [];

        return {treeDataMap, browserId, version, elements, setSelected};
    }

    describe('label', () => {
        function assertText_(opts, label) {
            const props = mkProps_(opts);

            const component = mount(<Label {...props} />);

            assert.equal(component.find('.rct-label__title').text(), label);
        }

        it('should show browserId for parent node', () => {
            assertText_({browserId: 'bro1', isLeaf: false}, 'bro1');
        });

        it('should show version for child node', () => {
            assertText_({version: 'v1', isLeaf: true}, 'v1');
        });
    });

    describe('should have "Only" button', () => {
        function check_(opts) {
            const props = mkProps_(opts);

            const component = mount(<Label {...props} />);

            assert.equal(component.find('.rct-label__controls').text(), 'Only');
        }

        it('if no elements selected', () => {
            check_({elements: []});
        });

        it('if element is not selected', () => {
            check_({browser: 'bro1', version: 'v1', elements: ['bro1 (v2)']});
        });

        it('if other elements selected', () => {
            check_({browser: 'bro1', version: 'v1', elements: ['bro1 (v1)', 'bro1 (v2)']});
        });

        it('if parent only selected', () => {
            const elements = ['bro1'];
            const treeDataMap = {
                bro1: {browserId: 'bro1'},
                'bro1 (v1)': {browserId: 'bro1', version: 'v1', isLeaf: true}
            };

            check_({browser: 'bro1', version: 'v1', treeDataMap, elements});
        });
    });

    describe('should have "Except" button', () => {
        function check_(opts) {
            const props = mkProps_(opts);

            const component = mount(<Label {...props} />);

            assert.equal(component.find('.rct-label__controls').text(), 'Except');
        }

        it('if only this leaf is selected', () => {
            check_({browserId: 'bro1', version: 'v1', elements: ['bro1 (v1)']});
        });

        it('if only this parent is selected', () => {
            const browserId = 'bro1';
            const elements = ['bro1 (v1)'];
            const treeDataMap = {
                bro1: {browserId: 'bro1'},
                'bro1 (v1)': {browserId: 'bro1', version: 'v1', isLeaf: true}
            };

            check_({browserId, treeDataMap, elements});
        });
    });

    describe('controls click', () => {
        let treeDataMap;

        beforeEach(() => {
            // V bro1
            // | v1
            // | v2
            //
            // V bro2
            // | v1
            // | v2
            //
            // bro3

            treeDataMap = {
                'bro1': {browserId: 'bro1'},
                'bro1 (v1)': {browserId: 'bro1', version: 'v1', isLeaf: true},
                'bro1 (v2)': {browserId: 'bro1', version: 'v2', isLeaf: true},
                'bro2': {browserId: 'bro2'},
                'bro2 (v1)': {browserId: 'bro2', version: 'v1', isLeaf: true},
                'bro2 (v2)': {browserId: 'bro2', version: 'v2', isLeaf: true},
                'bro3': {browserId: 'bro3', isLeaf: true}
            };
        });

        function click_(opts) {
            const props = mkProps_(Object.assign(opts, {treeDataMap}));

            const component = mount(<Label {...props} />);

            component.find('.rct-label__controls').first().simulate('click');
        }

        describe('"Only" click', () => {
            it('should select this leaf node', () => {
                click_({browserId: 'bro1', version: 'v1', elements: ['bro1 (v2)', 'bro2'], isLeaf: true});

                assert.calledOnceWith(setSelected, ['bro1 (v1)']);
            });

            it('should select child nodes', () => {
                click_({browserId: 'bro1', elements: ['bro2 (v2)'], isLeaf: false});

                assert.calledOnceWith(setSelected, ['bro1 (v1)', 'bro1 (v2)']);
            });
        });

        describe('"Except" click', () => {
            it('should select all nodes leaf node', () => {
                click_({browserId: 'bro1', version: 'v1', elements: ['bro1 (v1)'], isLeaf: true});

                assert.calledOnceWith(setSelected, ['bro1 (v2)', 'bro2 (v1)', 'bro2 (v2)', 'bro3']);
            });

            it('should select child nodes', () => {
                click_({browserId: 'bro2', elements: ['bro2'], isLeaf: false});

                assert.calledOnceWith(setSelected, ['bro1 (v1)', 'bro1 (v2)', 'bro3']);
            });
        });
    });
});
