const AI = require('../../lib/autocomplete-it');
const assert = require('assert');
const fs = require('fs');
const yaml = require('js-yaml');

const matchTests = yaml.load(
  fs.readFileSync('./test/integration/match-tests.yml', 'utf8')
);

describe('Integration | match()', () => {
  for (const matchTest of matchTests) {
    const inputs = matchTest.inputs;
    const instanceOptions = matchTest.instanceOptions;
    const query = matchTest.query;
    const matchOptions = matchTest.matchOptions;
    const expected = matchTest.result;
    const description =
      matchTest.description ||
      `"${query}" should match ${expected.length} of ${inputs.length} inputs`;
    it(description, () => {
      // Arrange
      const ai = new AI(inputs, instanceOptions);
      // Act
      const actual = ai.match(query, matchOptions);
      // Assert
      assert.deepEqual(Array.from(actual), expected);
    });
  }
});
