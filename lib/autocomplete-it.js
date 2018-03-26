const diacritics = require('diacritics');

const DEFAULT_LIMIT = 10;
const DEFAULT_MAX = 100;

class AutocompleteIt {
  constructor(inputs, options) {
    if (!inputs) throw new TypeError(`Inputs cannot be ${inputs}.`);
    this.inputs = inputs.slice();
    if (!options) options = {};
    if (!options.defaultLimit) options.defaultLimit = DEFAULT_LIMIT;
    if (!options.maximumLimit) options.maximumLimit = DEFAULT_MAX;
    this.options = options;
  }

  lookup(query, options) {
    this.initialize();
    if (!options) options = {};
    const { defaultLimit, maximumLimit } = this.options;
    if (!options.limit) options.limit = defaultLimit;
    if (options.limit > maximumLimit) options.limit = maximumLimit;
    const hrtime = process.hrtime();
    const normalizedQuery = AutocompleteIt.normalizeQuery(query);
    const results = options.highlight
      ? this.getHighlightedResults(normalizedQuery, options)
      : this.getResults(normalizedQuery, options);
    if (!results.meta) results.meta = {};
    results.meta.ms = hrdiff(hrtime, process.hrtime());
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
        if (key !== input) info.value = input;
        if (map) info.map = map;
        index[key] = info;
      }
      keys.push(key);
    }
    this.index = index;
    this.keys = keys;
    delete this.inputs;
  }

  getResults(query, options) {
    const matchGroups = this.getMatchGroups(query, options);
    return this.collateMatchedGroups(matchGroups, options);
  }

  getHighlightedResults(query, options) {
    const matchGroups = this.getHighlightedMatchGroups(query, options);
    return this.collateHighlightedMatchedGroups(matchGroups, options);
  }

  getMatchGroups(query, options) {
    const fullRegex = AutocompleteIt.compileRegex(query);
    const fullMatches = [];
    const fullMidMatches = [];
    const splitMatches = [];
    const splitMidMatches = [];
    const groups = {
      meta: {
        patterns: {
          full: fullRegex
        }
      },
      full: fullMatches,
      fullMid: fullMidMatches,
      split: splitMatches,
      splitMid: splitMidMatches
    };
    const matched = new Set();
    for (const key of this.keys) {
      const match = key.match(fullRegex);
      if (!match) continue;
      if (match.index === 0) {
        fullMatches.push(key);
        if (fullMatches.length >= options.limit) return groups;
      } else {
        fullMidMatches.push(key);
      }
      matched.add(key);
    }
    const fullCount = fullMatches.length + fullMidMatches.length;
    if (fullCount >= options.limit) return groups;
    const splitRegex = AutocompleteIt.compileSplitRegex(query);
    groups.meta.patterns.split = splitRegex;
    for (const key of this.keys) {
      if (matched.has(key)) continue;
      const match = key.match(splitRegex);
      if (!match) continue;
      if (match.index === 0) {
        splitMatches.push(key);
        if (fullCount + splitMatches.length >= options.limit) return groups;
      } else {
        splitMidMatches.push(key);
      }
    }
    return groups;
  }

  getHighlightedMatchGroups(query, options) {
    throw new Error('Not Implemented'); // TODO: Implement
  }

  collateMatchedGroups(matchGroups, options) {
    let results = [].concat(
      matchGroups.full,
      matchGroups.fullMid,
      matchGroups.split,
      matchGroups.splitMid
    );
    results = results
      .slice(0, options.limit)
      .map(key => (this.index[key] || {}).value || key);
    results.meta = matchGroups.meta;
    return results;
  }

  collateHighlightedMatchedGroups(matchGroups, options) {
    throw new Error('Not Implemented'); // TODO: Implement
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
      .toLowerCase()
      .trim();
    return normalizedQuery;
  }

  static compileRegex(query) {
    const words = query.split(/\s+/);
    const pattern = `\\b${words.join('.*\\b')}`;
    return new RegExp(pattern, 'i');
  }

  static compileSplitRegex(query) {
    const words = query.split(/\s+/);
    const pattern = words
      .map(word => Array.from(word).join('(?:.*\\b|)'))
      .join('.*\\b');
    return new RegExp(pattern, 'i');
  }
}

function hrdiff(hr1, hr2) {
  return hr2[0] * 1000 + hr2[1] / 1000000 - (hr1[0] * 1000 + hr1[1] / 1000000);
}

module.exports = AutocompleteIt;
