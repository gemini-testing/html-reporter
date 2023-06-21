import proxyquire from 'proxyquire';

describe('lib/static/modules/reducers/grouped-tests/by/meta', () => {
    const sandbox = sinon.sandbox.create();
    let module, handleActiveResults, addGroupItem, sortGroupValues;

    beforeEach(() => {
        handleActiveResults = sandbox.stub().named('handleActiveResults')
            .callsFake(({resultCb}) => resultCb({metaInfo: {key: 'value'}}));
        addGroupItem = sandbox.stub().named('addGroupItem').returns(undefined);
        sortGroupValues = sandbox.stub().named('sortGroupValues').returns([]);

        module = proxyquire('lib/static/modules/reducers/grouped-tests/by/meta', {
            '../helpers': {handleActiveResults, addGroupItem, sortGroupValues}
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

    describe('"groupMeta" method', () => {
        it('should collect only uniq meta keys', () => {
            const group = {};
            const results = [
                {metaInfo: {key1: 1}},
                {metaInfo: {key1: 2}}
            ];
            handleResults_(results);

            module.groupMeta({group});

            assert.deepEqual(group.allKeys, ['key1']);
        });

        it('should sort collected meta keys', () => {
            const group = {};
            const results = [
                {metaInfo: {zzz: 1}},
                {metaInfo: {bbb: 2, aaa: 3}}
            ];
            handleResults_(results);

            module.groupMeta({group});

            assert.deepEqual(group.allKeys, ['aaa', 'bbb', 'zzz']);
        });

        it('should correctly pass args to "handleActiveResults" method', () => {
            const group = {};
            const restArgs = {foo: 'bar', baz: 'qux'};

            module.groupMeta({group, ...restArgs});

            assert.calledOnceWith(handleActiveResults, {...restArgs, resultCb: sinon.match.func});
        });

        it('should not group tests by meta keys if "groupKey" is not passed', () => {
            module.groupMeta({group: {}});

            assert.notCalled(addGroupItem);
            assert.notCalled(sortGroupValues);
        });

        it('should group tests only by passed meta key', () => {
            const group = {byKey: {}};
            const results = [
                {metaInfo: {aaa: 1}},
                {metaInfo: {bbb: 2, aaa: 3}}
            ];
            handleResults_(results);

            module.groupMeta({group, groupKey: 'aaa'});

            assert.calledTwice(addGroupItem);
            assert.calledWith(addGroupItem.firstCall, {group: sinon.match.object, result: results[0], value: 1});
            assert.calledWith(addGroupItem.secondCall, {group: sinon.match.object, result: results[1], value: 3});
        });

        it('should sort group values by passed meta key', () => {
            const groupKey = 'aaa';
            const group = {byKey: {[groupKey]: {}}};
            const results = [
                {metaInfo: {aaa: 1}},
                {metaInfo: {bbb: 2, aaa: 3}}
            ];
            handleResults_(results);
            sortGroupValues.withArgs(group.byKey[groupKey]).returns([{name: 1}, {name: 3}]);

            module.groupMeta({group, groupKey});

            assert.deepEqual(group.byKey[groupKey], [{name: 1}, {name: 3}]);
        });
    });
});
