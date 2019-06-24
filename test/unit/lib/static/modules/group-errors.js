'use strict';

const {groupErrors} = require('lib/static/modules/group-errors');
const {
    mkSuite,
    mkState,
    mkBrowserResult,
    mkSuiteTree,
    mkTestResult
} = require('../../../utils');
const {mkImg_} = require('../components/utils');

function mkBrowserResultWithStatus(status) {
    return mkBrowserResult({
        name: `${status} test`,
        result: mkTestResult({
            status: status
        }),
        retries: [
            mkTestResult({
                error: {
                    message: `message stub ${status}`
                }
            })
        ]
    });
}

describe('static/modules/group-errors', () => {
    it('should collect errors from all tests if viewMode is "all"', () => {
        const suites = [
            mkSuiteTree({
                browsers: [
                    mkBrowserResultWithStatus('skipped'),
                    mkBrowserResultWithStatus('success'),
                    mkBrowserResultWithStatus('fail'),
                    mkBrowserResultWithStatus('error')
                ]
            })
        ];

        const result = groupErrors({suites, viewMode: 'all'});

        assert.lengthOf(result, 4);
        assert.include(result[0], {
            count: 1,
            name: 'message stub error'
        });
        assert.include(result[1], {
            count: 1,
            name: 'message stub fail'
        });
        assert.include(result[2], {
            count: 1,
            name: 'message stub skipped'
        });
        assert.include(result[3], {
            count: 1,
            name: 'message stub success'
        });
    });

    it('should collect errors only from failed tests if viewMode is "failed"', () => {
        const suites = [
            mkSuiteTree({
                suite: mkSuite({status: 'error'}),
                browsers: [
                    mkBrowserResultWithStatus('skipped'),
                    mkBrowserResultWithStatus('success'),
                    mkBrowserResultWithStatus('fail'),
                    mkBrowserResultWithStatus('error')
                ]
            })
        ];

        const result = groupErrors({suites, viewMode: 'failed'});

        assert.lengthOf(result, 2);
        assert.include(result[0], {
            count: 1,
            name: 'message stub error'
        });
        assert.include(result[1], {
            count: 1,
            name: 'message stub fail'
        });
    });

    it('should collect errors from error and imagesInfo[].error', () => {
        const suites = [
            mkSuiteTree({
                browsers: [
                    mkBrowserResult({
                        result: mkTestResult({
                            error: {
                                message: 'message stub first'
                            },
                            imagesInfo: [
                                {error: {message: 'message stub second'}}
                            ]
                        })
                    })
                ]
            })
        ];

        const result = groupErrors({suites});

        assert.deepEqual(result, [
            {
                count: 1,
                name: 'message stub first',
                pattern: 'message stub first',
                tests: {
                    'default-suite default-state': ['default-bro']
                }
            },
            {
                count: 1,
                name: 'message stub second',
                pattern: 'message stub second',
                tests: {
                    'default-suite default-state': ['default-bro']
                }
            }
        ]);
    });

    it('should collect image comparison fails', () => {
        const suites = [
            mkSuiteTree({
                browsers: [
                    mkBrowserResult({
                        result: mkTestResult({
                            imagesInfo: [{diffImg: mkImg_()}]
                        })
                    })
                ]
            })
        ];

        const result = groupErrors({suites});

        assert.lengthOf(result, 1);
        assert.include(result[0], {
            count: 1,
            name: 'image comparison failed',
            pattern: 'image comparison failed'
        });
    });

    it('should collect errors from result and retries', () => {
        const suites = [
            mkSuiteTree({
                browsers: [
                    mkBrowserResult({
                        result: mkTestResult({
                            error: {
                                message: 'message stub first'
                            }
                        }),
                        retries: [
                            mkTestResult({
                                error: {
                                    message: 'message stub second'
                                }
                            })
                        ]
                    })
                ]
            })
        ];

        const result = groupErrors({suites});

        assert.deepEqual(result, [
            {
                count: 1,
                name: 'message stub first',
                pattern: 'message stub first',
                tests: {
                    'default-suite default-state': ['default-bro']
                }
            },
            {
                count: 1,
                name: 'message stub second',
                pattern: 'message stub second',
                tests: {
                    'default-suite default-state': ['default-bro']
                }
            }
        ]);
    });

    it('should collect errors from children recursively', () => {
        const suites = [
            mkSuite({
                suitePath: ['suite'],
                children: [
                    mkSuite({
                        suitePath: ['suite', 'state-one'],
                        children: [
                            mkState({
                                suitePath: ['suite', 'state-one', 'state-two'],
                                browsers: [
                                    mkBrowserResult({
                                        result: mkTestResult({
                                            error: {
                                                message: 'message stub'
                                            }
                                        })
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
        ];

        const result = groupErrors({suites});

        assert.deepEqual(result, [
            {
                count: 1,
                name: 'message stub',
                pattern: 'message stub',
                tests: {
                    'suite state-one state-two': ['default-bro']
                }
            }
        ]);
    });

    it('should group errors from different browser but single test', () => {
        const suites = [
            mkSuiteTree({
                browsers: [
                    mkBrowserResult({
                        name: 'browserOne',
                        result: mkTestResult({
                            error: {
                                message: 'message stub'
                            }
                        })
                    }),
                    mkBrowserResult({
                        name: 'browserTwo',
                        result: mkTestResult({
                            error: {
                                message: 'message stub'
                            }
                        })
                    })
                ]
            })
        ];

        const result = groupErrors({suites});

        assert.deepEqual(result, [
            {
                count: 2,
                name: 'message stub',
                pattern: 'message stub',
                tests: {
                    'default-suite default-state': ['browserOne', 'browserTwo']
                }
            }
        ]);
    });

    it('should filter by test name', () => {
        const suites = [
            mkSuite({
                suitePath: ['suite'],
                children: [
                    mkSuite({
                        suitePath: ['suite', 'state-one'],
                        browsers: [
                            mkBrowserResult({
                                result: mkTestResult({
                                    error: {
                                        message: 'message stub'
                                    }
                                })
                            })
                        ]
                    }),
                    mkSuite({
                        suitePath: ['suite', 'state-two'],
                        browsers: [
                            mkBrowserResult({
                                result: mkTestResult({
                                    error: {
                                        message: 'message stub'
                                    }
                                })
                            })
                        ]
                    })
                ]
            })
        ];

        const result = groupErrors({
            suites,
            testNameFilter: 'suite state-one'
        });
        assert.deepEqual(result, [
            {
                count: 1,
                name: 'message stub',
                pattern: 'message stub',
                tests: {
                    'suite state-one': ['default-bro']
                }
            }
        ]);
    });

    it('should filter by browser', () => {
        const suites = [
            mkSuite({
                suitePath: ['suite'],
                children: [
                    mkSuite({
                        suitePath: ['suite', 'state'],
                        browsers: [
                            mkBrowserResult({
                                name: 'browser-one',
                                result: mkTestResult({
                                    error: {
                                        message: 'message stub'
                                    }
                                })
                            }),
                            mkBrowserResult({
                                name: 'browser-two',
                                result: mkTestResult({
                                    error: {
                                        message: 'message stub'
                                    }
                                })
                            })
                        ]
                    })
                ]
            })
        ];

        const result = groupErrors({
            suites,
            filteredBrowsers: ['browser-one']
        });
        assert.deepEqual(result, [
            {
                count: 1,
                name: 'message stub',
                pattern: 'message stub',
                tests: {
                    'suite state': ['browser-one']
                }
            }
        ]);
    });

    it('should group by regexp', () => {
        const suites = [
            mkSuiteTree({
                browsers: [
                    mkBrowserResult({
                        result: mkTestResult({
                            error: {
                                message: 'message stub first'
                            }
                        }),
                        retries: [
                            mkTestResult({
                                error: {
                                    message: 'message stub second'
                                }
                            })
                        ]
                    })
                ]
            })
        ];
        const errorPatterns = [
            {
                name: 'Name group: message stub first',
                pattern: 'message .* first'
            }
        ];

        const result = groupErrors({suites, errorPatterns});
        assert.deepEqual(result, [
            {
                count: 1,
                name: 'message stub second',
                pattern: 'message stub second',
                tests: {
                    'default-suite default-state': ['default-bro']
                }
            },
            {
                count: 1,
                name: 'Name group: message stub first',
                pattern: 'message .* first',
                tests: {
                    'default-suite default-state': ['default-bro']
                }
            }
        ]);
    });
});
