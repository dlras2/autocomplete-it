const AI = require('../../lib/autocomplete-it');
const assert = require('assert');
const fs = require('fs');
const yaml = require('js-yaml');

const highlightTests = yaml.load(
  fs.readFileSync('./test/integration/highlight-tests.yml', 'utf8')
);

describe('Integration | Highlight', () => {
  for (const highlightTest of highlightTests) {
    const { query, highlights, instanceOptions, lookupOptions } = highlightTest;
    const inputs = highlights.map(value => value.replace(/[\(\)]/g, ''));
    const description =
      highlightTest.description ||
      `"${query}" should highlight ${highlights.length} values`;
    if (lookupOptions) {
      lookupOptions.highlight = '()';
    }
    it(description, () => {
      // Arrange
      const ai = new AI(inputs, instanceOptions);
      // Act
      const results = ai.lookup(query, lookupOptions || { highlight: '()' });
      const actual = results.map(result => result.display);
      // Assert
      assert.deepEqual(Array.from(actual), highlights);
    });
  }
});
