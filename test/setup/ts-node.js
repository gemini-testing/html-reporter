require('ts-node').register({
    swc: true,
    experimentalResolver: true,
    compilerOptions: {
        jsx: 'react',
        module: 'commonjs',
        moduleResolution: 'node'
    }
});
