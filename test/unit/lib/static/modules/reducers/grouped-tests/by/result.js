import proxyquire from 'proxyquire';
import {ERROR_KEY, RESULT_KEYS} from 'lib/constants/group-tests';
import {mkImage, mkStateTree} from '../../../../state-utils';

describe('lib/static/modules/reducers/grouped-tests/by/result', () => {
    const sandbox = sinon.sandbox.create();
    let module, handleActiveResults, addGroupItem, sortGroupValues, isAssertViewError;

    beforeEach(() => {
        handleActiveResults = sandbox.stub().named('handleActiveResults')
            .callsFake(({resultCb}) => resultCb({error: {message: 'err'}, imageIds: []}));
        addGroupItem = sandbox.stub().named('addGroupItem').returns(undefined);
        sortGroupValues = sandbox.stub().named('sortGroupValues').returns([]);
        isAssertViewError = sandbox.stub().named('isAssertViewError').returns(false);

        module = proxyquire('lib/static/modules/reducers/grouped-tests/by/result', {
            '../helpers': {handleActiveResults, addGroupItem, sortGroupValues},
            '../../../../../common-utils': {isAssertViewError}
        });
    });

    afterEach(() => sandbox.restore());

    const handleResults_ = (results = []) => {
        handleActiveResults.callsFake(({resultCb}) => {
            results.forEach((result) => {
                resultCb(result);
            });
        });
    };

    describe('"groupResult" method', () => {
        it('should throw error if passed group key is not supported', () => {
            const availableKeys = RESULT_KEYS.join(', ');

            assert.throws(
                () => module.groupResult({groupKey: 'unknown-key'}),
                new RegExp(`Group key must be one of ${availableKeys}, but got unknown-key`)
            );
        });

        it('should collect errors from tests', () => {
            const group = {byKey: {}};
            const results = [
                {error: {message: 'err-1'}, imageIds: []},
                {error: {message: 'err-2'}, imageIds: []}
            ];

            handleResults_(results);
            module.groupResult({group, groupKey: ERROR_KEY});

            assert.calledTwice(addGroupItem);
            assert.calledWith(
                addGroupItem.firstCall,
                {group: sinon.match.object, diff: {}, result: results[0], value: 'err-1', patterns: []}
            );
            assert.calledWith(
                addGroupItem.secondCall,
                {group: sinon.match.object, diff: {}, result: results[1], value: 'err-2', patterns: []}
            );
        });

        it('should collect errors from tests and images', () => {
            const group = {byKey: {}};
            const results = [
                {error: {message: 'err-1'}, imageIds: ['img-1']}
            ];
            const imagesById = {...mkImage({id: 'img-1', error: {message: 'img-err'}})};
            const tree = mkStateTree({imagesById});

            handleResults_(results);
            module.groupResult({group, groupKey: ERROR_KEY, tree});

            assert.calledTwice(addGroupItem);
            assert.calledWith(
                addGroupItem.firstCall,
                {group: sinon.match.object, diff: {}, result: results[0], value: 'img-err', patterns: []}
            );
            assert.calledWith(
                addGroupItem.secondCall,
                {group: sinon.match.object, diff: {}, result: results[0], value: 'err-1', patterns: []}
            );
        });

        it('should collect errors only from images if test has assert view error', () => {
            const group = {byKey: {}};
            const results = [
                {error: {message: 'err'}, imageIds: ['img-1']}
            ];
            const imagesById = {...mkImage({id: 'img-1', error: {message: 'img-err'}})};
            const tree = mkStateTree({imagesById});
            isAssertViewError.withArgs(results[0].error).returns(true);

            handleResults_(results);
            module.groupResult({group, groupKey: ERROR_KEY, tree});

            assert.calledOnceWith(
                addGroupItem,
                {group: sinon.match.object, diff: {}, result: results[0], value: 'img-err', patterns: []}
            );
        });

        it('should collect image comparison fails', () => {
            const group = {byKey: {}};
            const results = [{imageIds: ['img-1']}];
            const imagesById = {...mkImage({id: 'img-1', diffImg: {}})};
            const tree = mkStateTree({imagesById});

            handleResults_(results);
            module.groupResult({group, groupKey: ERROR_KEY, tree});

            assert.calledOnceWith(
                addGroupItem,
                {group: sinon.match.object, diff: {}, result: results[0], value: 'image comparison failed', patterns: []}
            );
        });

        it('should sort errors', () => {
            const group = {byKey: {[ERROR_KEY]: {}}};
            const results = [
                {error: {message: 'err-1'}, imageIds: []},
                {error: {message: 'err-2'}, imageIds: []}
            ];
            sortGroupValues.withArgs(group.byKey[ERROR_KEY]).returns([{name: 'err-1'}, {name: 'err-2'}]);

            handleResults_(results);
            module.groupResult({group, groupKey: ERROR_KEY});

            assert.deepEqual(group.byKey[ERROR_KEY], [{name: 'err-1'}, {name: 'err-2'}]);
        });
    });
});
