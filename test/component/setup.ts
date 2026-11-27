import './styles.css';

beforeEach(async () => {
    // Some components measure their content on mount, before a fallback font can be replaced.
    await document.fonts.load('1em Jost');
});
