const AI = require('../../lib/autocomplete-it');
const assert = require('assert');
const fs = require('fs');
const yaml = require('js-yaml');

const lookupTests = yaml.load(
  fs.readFileSync('./test/integration/lookup-tests.yml', 'utf8')
);

describe('Integration | Lookup', () => {
  for (const lookupTest of lookupTests) {
    const {
      query,
      matches,
      ignores,
      instanceOptions,
      lookupOptions
    } = lookupTest;
    const inputs = [].concat(matches || [], ignores || []);
    let description = lookupTest.description;
    if (!description) {
      if (matches && ignores) {
        description = `"${query}" should match ${matches.length} of ${
          inputs.length
        } values`;
      } else if (matches) {
        description = `"${query}" should match ${matches.length} values`;
      } else if (ignores) {
        description = `"${query}" shouldn't match ${ignores.length} values`;
      } else {
        throw new Error();
      }
    }
    it(description, () => {
      // Arrange
      const ai = new AI(inputs, instanceOptions);
      // Act
      const actual = ai.lookup(query, lookupOptions);
      // Assert
      assert.deepEqual(Array.from(actual), matches);
    });
  }
});
