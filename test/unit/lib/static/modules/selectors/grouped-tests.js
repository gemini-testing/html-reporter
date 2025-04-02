const proxyquire = require('proxyquire');
const {SECTIONS, ERROR_KEY, KEY_DELIMITER} = require('lib/constants/group-tests');

describe('grouped-tests selectors', () => {
    const sandbox = sinon.sandbox.create();
    let selector, parseKeyToGroupTestsBy;

    beforeEach(() => {
        parseKeyToGroupTestsBy = sandbox.stub().named('parseKeyToGroupTestsBy').returns([]);

        selector = proxyquire('lib/static/modules/selectors/grouped-tests', {
            '../utils': {parseKeyToGroupTestsBy}
        });
    });

    afterEach(() => sandbox.restore());

    describe('"getParsedKeyToGroupTestsBy" method', () => {
        it('should return empty array if group is not selected', () => {
            const view = {keyToGroupTestsBy: ''};

            const parsedGroup = selector.getParsedKeyToGroupTestsBy({view});

            assert.deepEqual(parsedGroup, []);
        });

        it('should return parsed group section and key', () => {
            const view = {keyToGroupTestsBy: `${SECTIONS.RESULT}${KEY_DELIMITER}${ERROR_KEY}`};
            parseKeyToGroupTestsBy.withArgs(view.keyToGroupTestsBy).returns([SECTIONS.RESULT, ERROR_KEY]);

            const parsedGroup = selector.getParsedKeyToGroupTestsBy({view});

            assert.deepEqual(parsedGroup, [SECTIONS.RESULT, ERROR_KEY]);
        });
    });
});
