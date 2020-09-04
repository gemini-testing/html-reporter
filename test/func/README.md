functional tests for html-reporter
==================================

Directories description:

**main** - contains main set of suites for basic html-reporter features testing.

```sh
# To run functional tests on html-reporter main features
> npm run test-func-main
```

**plugins** - set of suites for html-reporter plugins testing.

```sh
# To run functional tests on html-reporter plugins feature
> npm run test-func-plugins
```

```sh
# To run functional tests on both main features & html-reporter plugins feature
> npm run test-func
```

**fixtures** - common set of fixture example tests to generate report for further functional tests.

**hermione-plugins** - _hermione_ helper plugins to facilitate the functional tests.

**html-reporter-plugins** - _html-reporter_ plugins for functional tests.
