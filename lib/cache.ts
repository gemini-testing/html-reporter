export class Cache<Key, Value> {
    private _getKeyHash: (key: Key) => string;
    private _cache: Map<string, Value>;

    constructor(hashFn: (key: Key) => string) {
        this._getKeyHash = hashFn;
        this._cache = new Map();
    }

    has(key: Key): boolean {
        const keyHash = this._getKeyHash(key);

        return this._cache.has(keyHash);
    }

    get(key: Key): Value | undefined {
        const keyHash = this._getKeyHash(key);

        return this._cache.get(keyHash);
    }

    set(key: Key, value: Value): this {
        const keyHash = this._getKeyHash(key);

        if (value !== undefined) {
            this._cache.set(keyHash, value);
        } else {
            this._cache.delete(keyHash);
        }

        return this;
    }
}
