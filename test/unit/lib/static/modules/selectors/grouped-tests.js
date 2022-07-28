import proxyquire from 'proxyquire';
import {SECTIONS, ERROR_KEY, KEY_DELIMITER} from 'lib/constants/group-tests';

describe('grouped-tests selectors', () => {
    const sandbox = sinon.sandbox.create();
    let selector, parseGroupTestsByKey;

    beforeEach(() => {
        parseGroupTestsByKey = sandbox.stub().named('parseGroupTestsByKey').returns([]);

        selector = proxyquire('lib/static/modules/selectors/grouped-tests', {
            '../utils': {parseGroupTestsByKey}
        });
    });

    afterEach(() => sandbox.restore());

    describe('"getParsedGroupTestsByKey" method', () => {
        it('should return empty array if group is not selected', () => {
            const view = {groupTestsByKey: ''};

            const parsedGroup = selector.getParsedGroupTestsByKey({view});

            assert.deepEqual(parsedGroup, []);
        });

        it('should return parsed group section and key', () => {
            const view = {groupTestsByKey: `${SECTIONS.RESULT}${KEY_DELIMITER}${ERROR_KEY}`};
            parseGroupTestsByKey.withArgs(view.groupTestsByKey).returns([SECTIONS.RESULT, ERROR_KEY]);

            const parsedGroup = selector.getParsedGroupTestsByKey({view});

            assert.deepEqual(parsedGroup, [SECTIONS.RESULT, ERROR_KEY]);
        });
    });
});
