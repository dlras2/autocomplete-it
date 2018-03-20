const assert = require('assert');
const mock = require('mock-require');

let AI;

describe('Unit | AutocompleteIt', () => {
  beforeEach(() => {
    AI = require('../../lib/autocomplete-it');
  });

  it('should reject default constructor', () => {
    // Arrange
    const expected = /Values cannot be undefined\./;
    // Act / Assert
    assert.throws(() => new AI(), expected);
  });

  it('should reject null values', () => {
    // Arrange
    const values = null;
    const expected = /Values cannot be null\./;
    // Act / Assert
    assert.throws(() => new AI(values), expected);
  });

  it('should accept no options', () => {
    // Arrange
    const values = [];
    // Act
    const ai = new AI(values);
    // Assert
    assert.deepEqual(ai._options, {});
  });

  it('should accept options object', () => {
    // Arrange
    const values = [];
    const options = {};
    // Act
    const ai = new AI(values, options);
    // Assert
    assert.equal(ai._options, options);
  });
});
