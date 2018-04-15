const assert = require('assert');
const mock = require('mock-require');

let AI;

describe('Unit | AI', () => {
  beforeEach(() => {
    AI = mock.reRequire('../../lib/autocomplete-it');
  });

  it('should reject default constructor', () => {
    // Arrange
    const expected = /Inputs cannot be undefined\./;
    // Act / Assert
    assert.throws(() => new AI(), expected);
  });

  it('should reject null inputs', () => {
    // Arrange
    const inputs = null;
    const expected = /Inputs cannot be null\./;
    // Act / Assert
    assert.throws(() => new AI(inputs), expected);
  });

  it('should accept no options', () => {
    // Arrange
    const inputs = [];
    // Act
    const ai = new AI(inputs);
    // Assert
    assert.ok(ai.options);
  });

  it('should accept options object', () => {
    // Arrange
    const inputs = [];
    const options = {};
    // Act
    const ai = new AI(inputs, options);
    // Assert
    assert.equal(ai.options, options);
  });

  describe('mapDiacritics', () => {
    it('should ignore inputs without diacritics', () => {
      // Arrange
      const input = 'AEther';
      const expectedKey = 'AEther';
      const expectedMap = undefined;
      // Act
      const { key, map } = AI.mapDiacritics(input);
      // Assert
      assert.equal(key, expectedKey);
      assert.deepEqual(map, expectedMap);
    });

    it('should replace simple diacritics with ASCII representation', () => {
      // Arrange
      const input = '\u24B6\u24B7\u24b8';
      const expectedKey = 'ABC';
      const expectedMap = undefined;
      // Act
      const { key, map } = AI.mapDiacritics(input);
      // Assert
      assert.equal(key, expectedKey);
      assert.deepEqual(map, expectedMap);
    });

    it('should map multicharacter representations', () => {
      // Arrange
      const input = '\u00C6\u00FEer';
      const expectedKey = 'AEther';
      const expectedMap = [-1, -1, 0, 0];
      // Act
      const { key, map } = AI.mapDiacritics(input);
      // Assert
      assert.equal(key, expectedKey);
      assert.deepEqual(Array.from(map), expectedMap);
    });
  });

  describe('mapNonBreakingPunctuation', () => {
    it('should ignore inputs without non-breaking punctuation', () => {
      // Arrange
      const input = 'It is over 9000!';
      const expectedKey = 'It is over 9000!';
      const expectedMap = undefined;
      // Act
      const { key, map } = AI.mapNonBreakingPunctuation(input);
      // Assert
      assert.equal(key, expectedKey);
      assert.deepEqual(map, expectedMap);
    });

    it('should remove all non-breaking punctuation', () => {
      // Arrange
      const input = "It's over 9,000!";
      const expectedKey = 'Its over 9000!';
      const expectedMap = [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0];
      // Act
      const { key, map } = AI.mapNonBreakingPunctuation(input);
      // Assert
      assert.equal(key, expectedKey);
      assert.deepEqual(Array.from(map), expectedMap);
    });
  });

  describe('mapSplitCasing', () => {
    it('should ignore inputs without split casing', () => {
      // Arrange
      const input = 'kabob-case, snake_case';
      const expectedKey = 'kabob-case, snake_case';
      const expectedMap = undefined;
      // Act
      const { key, map } = AI.mapSplitCasing(input);
      // Assert
      assert.equal(key, expectedKey);
      assert.deepEqual(map, expectedMap);
    });

    it('should break up words with split casing', () => {
      // Arrange
      const input = 'PascalCase';
      const expectedKey = 'Pascal Case';
      const expectedMap = [0, 0, 0, 0, 0, 0, -1, 0, 0, 0];
      // Act
      const { key, map } = AI.mapSplitCasing(input);
      // Assert
      assert.equal(key, expectedKey);
      assert.deepEqual(Array.from(map), expectedMap);
    });

    it('should treat acronyms as a single word', () => {
      // Arrange
      const input = 'blahBlahJSON';
      const expectedKey = 'blah Blah JSON';
      const expectedMap = [0, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0];
      // Act
      const { key, map } = AI.mapSplitCasing(input);
      // Assert
      assert.equal(key, expectedKey);
      assert.deepEqual(Array.from(map), expectedMap);
    });
  });

  describe('mergeMaps', () => {
    it('should return the first map if the second is undefined', () => {
      // Arrange
      const expected = [-1, -1, 0, 0];
      // Act
      const actual = AI.mergeMaps(expected, undefined);
      // Assert
      assert.equal(actual, expected);
    });

    it('should return the second map if the first is undefined', () => {
      // Arrange
      const expected = [-1, -1, 0, 0];
      // Act
      const actual = AI.mergeMaps(undefined, expected);
      // Assert
      assert.equal(actual, expected);
    });
  });

  describe('applySpanMap', () => {
    it('should map "AE(th)er (90)00" to "Æ(þ)er (9,0)00"', () => {
      // Arrange
      const map = [-1, -1, 0, 0, 0, 0, 1, 0, 0, 0];
      // AE(th)er (90)00 => Æ(þ)er (9,0)00
      const spans = [2, 2, 3, 2];
      const expected = [1, 1, 3, 3];
      // Act
      AI.applySpanMap(spans, map);
      // Assert
      assert.deepEqual(spans, expected);
    });

    it('should map "(Its) over (90)00!" to "(It\'s) over (9,0)00!"', () => {
      // Arrange
      const map = [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0];
      // (Its) over (90)00! => (It's) over (9,0)00!
      const spans = [0, 3, 6, 2];
      const expected = [0, 4, 6, 3];
      // Act
      AI.applySpanMap(spans, map);
      // Assert
      assert.deepEqual(spans, expected);
    });

    it('should map "(P)ascal (C)ase" to "(P)ascal(C)ase"', () => {
      // Arrange
      const map = [0, 0, 0, 0, 0, 0, -1, 0, 0, 0];
      // (P)ascal (C)ase => (P)ascal(C)ase
      const spans = [0, 1, 6, 1];
      const expected = [0, 1, 5, 1];
      // Act
      AI.applySpanMap(spans, map);
      // Assert
      assert.deepEqual(spans, expected);
    });

    it('should map "blah Blah (JS)ON" to "blahBlah(JS)ON"', () => {
      // Arrange
      const map = [0, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0];
      // blah Blah (JS)ON => blahBlah(JS)ON
      const spans = [10, 2];
      const expected = [8, 2];
      // Act
      AI.applySpanMap(spans, map);
      // Assert
      assert.deepEqual(spans, expected);
    });
  });
});
