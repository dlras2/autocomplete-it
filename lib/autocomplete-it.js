const diacritics = require('diacritics');

class AutocompleteIt {
  constructor(inputs, options) {
    if (inputs === null || inputs === undefined) {
      throw new TypeError(`Inputs cannot be ${inputs}.`);
    }
    this.inputs = inputs.slice();
    this.options = options || {};
  }

  lookup(query, options) {
    this.initialize();
    options = options || {};
    const hrtime = process.hrtime();
    const normalizedQuery = AutocompleteIt.normalizeQuery(query);
    const matches = this.getMatches(normalizedQuery, options);
    const results = this.collateResults(matches, options);
    results.meta = results.meta || {};
    results.meta.ms = hrDiff(hrtime, process.hrtime());
    return results;
  }

  initialize() {
    if (this.index) return;
    const index = {};
    const keys = [];
    this.inputs.sort();
    for (const input of this.inputs) {
      const { key, map } = AutocompleteIt.map(input);
      if (key !== input || map) {
        const info = {};
        if (key !== input) {
          info.value = input;
        }
        if (map) {
          info.map = map;
        }
        index[key] = info;
      }
      keys.push(key);
    }
    this.index = index;
    this.keys = keys;
    delete this.inputs;
  }

  getMatches(normalizedQuery, options) {
    const regex = AutocompleteIt.compileExpression(normalizedQuery);
    const matches = this.keys.map(key => key.match(regex)).filter(m => m);
    matches.meta = { regex };
    return matches;
  }

  collateResults(matches, options) {
    let results;
    if (options.highlight) {
      let open, close;
      if (options.highlight.length === 2) {
        open = options.highlight[0];
        close = options.highlight[1];
      } else {
        open = close = options.highlight;
      }
      results = matches.map(match => {
        const info = this.index[match.input];
        const value = info && info.value ? info.value : match.input;
        const map = info && info.map ? info.map : undefined;
        const display = AutocompleteIt.highlightMatch(match, map, open, close);
        return { display, value };
      });
    } else {
      results = matches.map(match => {
        const info = this.index[match.input];
        return info && info.value ? info.value : match.input;
      });
    }
    results.meta = matches.meta;
    return results;
  }

  static highlightMatch(match, map, open, close) {
    return map
      ? this.highlightMappedMatch(match, map, open, close)
      : this.highlightUnmappedMatch(match, open, close);
  }

  static highlightMappedMatch(match, map, open, close) {
    throw new Error('Not Implemented'); // TODO: Implement
  }

  static highlightUnmappedMatch(match, open, close) {
    let result = `${match[1]}${open}`;
    let highlighting = true;
    for (let i = 2; i < match.length; i++) {
      const span = match[i];
      if (!span) continue;
      if (highlighting && i % 2 === 1) {
        result += `${close}${span}`;
        highlighting = false;
      } else if (!highlighting && i % 2 === 0) {
        result += `${open}${span}`;
        highlighting = true;
      } else {
        result += span;
      }
    }
    if (highlighting) {
      result += close;
    }
    return result;
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

  static compileExpression(normalizedQuery) {
    let pattern = `^`;
    let wordBreak = false;
    for (let i = 0; i < normalizedQuery.length; i++) {
      const c = normalizedQuery[i];
      if (c === ' ') {
        wordBreak = true;
        continue;
      }
      if (wordBreak) {
        pattern += `(.*\\b)(${c})`;
      } else {
        pattern += `(.*\\b|)(${c})`;
      }
      wordBreak = false;
    }
    pattern += '(.*)$';
    return new RegExp(pattern, 'i');
  }
}

function hrDiff(hr1, hr2) {
  return hr2[0] * 1000 + hr2[1] / 1000000 - (hr1[0] * 1000 + hr1[1] / 1000000);
}

module.exports = AutocompleteIt;
