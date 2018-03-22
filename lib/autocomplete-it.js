const diacritics = require('diacritics');

class AutocompleteIt {
  constructor(inputs, options) {
    if (inputs === null || inputs === undefined) {
      throw new TypeError(`Inputs cannot be ${inputs}.`);
    }
    this.inputs = inputs.slice();
    this.options = options || {};
  }

  match(query, options) {
    this.initialize();
    const normalizedQuery = AutocompleteIt.normalizeQuery(query);
    const regex = AutocompleteIt.compileExpression(normalizedQuery);
    const matches = this.keys.map(key => key.match(regex)).filter(m => m);
    const values = matches
      .map(m => m.input)
      .map(key => this.index[key].value || key);
    const result = values;
    result.regex = regex;
    return result;
    return matches;
  }

  initialize() {
    if (this.index) return;
    const index = {};
    const keys = [];
    this.inputs.sort();
    for (const input of this.inputs) {
      const { key, map } = AutocompleteIt.map(input);
      index[key] = { map };
      if (key !== input) {
        index[key].value = input;
      }
      keys.push(key);
    }
    this.index = index;
    this.keys = keys;
  }

  static map(input) {
    let map;
    let key = input;
    for (const mapper of [
      AutocompleteIt.mapDiacritics,
      AutocompleteIt.mapNonBreakingPunctuation,
      AutocompleteIt.mapSplitCasing
    ]) {
      const step = mapper(key);
      key = step.key;
      map = AutocompleteIt.mergeMaps(map, step.map);
    }
    return { key, map };
  }

  static mapDiacritics(input) {
    let map;
    const key = input.replace(/[^\u0000-\u007E]/g, (match, offset) => {
      // Replace the character with its ascii representation
      const replacement = diacritics.diacriticsMap[match];
      if (replacement) {
        const adjustment = match.length - replacement.length;
        if (adjustment) {
          map = map || new Int8Array(input.length);
          map[offset] = adjustment;
        }
        return replacement;
      }
      return match;
    });
    return { key, map };
  }

  static mapNonBreakingPunctuation(input) {
    let map;
    const key = input.replace(
      /\d[\.,](?=\d)|'(?=(?:[sd]|[rv]e|ll)\b)|n'(?=t\b)/g,
      (match, offset) => {
        map = map || new Int8Array(input.length);
        map[offset + match.length - 1] = 1;
        return match.substring(0, match.length - 1);
      }
    );
    return { key, map };
  }

  static mapSplitCasing(input) {
    let map;
    const key = input.replace(/[a-z][A-Z]/g, (match, offset) => {
      map = map || new Int8Array(input.length);
      map[offset + 1] = -1;
      return `${match[0]} ${match[1]}`;
    });
    return { key, map };
  }

  static mergeMaps(a, b) {
    if (!a || !b) return a || b;
    throw new Error('Not Implemented'); // TODO: Implement
  }

  static normalizeQuery(query) {
    const normalizedQuery = diacritics
      // Normalize diacritics by replacing them with ASCII
      .remove(query)
      // Remove any remaining non-word, non-space characters
      .replace(/[^\s\w]+/g, '')
      // Trim consecutive whitespace
      .replace(/\s+/g, ' ')
      .toLowerCase();
    return normalizedQuery;
  }

  static compileExpression(query) {
    let pattern = `\\b${query[0]}`;
    let wordBreak = false;
    for (let i = 1; i < query.length; i++) {
      const c = query[i];
      if (c === ' ') {
        wordBreak = true;
        continue;
      }
      if (wordBreak) {
        pattern += `.*\\b${c}`;
      } else {
        pattern += `(.*\\b)?${c}`;
      }
      wordBreak = false;
    }
    return new RegExp(pattern, 'i');
  }
}

module.exports = AutocompleteIt;
