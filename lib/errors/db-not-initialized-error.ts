export class DbNotInitializedError extends Error {
    constructor() {
        super('Database must be initialized before use');
    }
}
