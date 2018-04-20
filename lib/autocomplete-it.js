const diacritics = require('diacritics');
const { clocktime, trimArray } = require('./utils');

const DEFAULT_LIMIT = 10;
const DEFAULT_MAX = 100;

class AI {
  constructor(inputs, options) {
    if (!inputs) throw new TypeError(`Inputs cannot be ${inputs}.`);
    this.inputs = inputs.slice();
    if (!options) options = {};
    if (!options.defaultLimit) options.defaultLimit = DEFAULT_LIMIT;
    if (!options.maximumLimit) options.maximumLimit = DEFAULT_MAX;
    this.options = options;
  }

  lookup(query, options) {
    const initMs = this.initialize();
    if (!options) options = {};
    const { defaultLimit, maximumLimit } = this.options;
    if (!options.limit) options.limit = defaultLimit;
    if (options.limit > maximumLimit) options.limit = maximumLimit;
    const timestamp = clocktime();
    const normalizedQuery = AI.normalizeQuery(query);
    const results = options.highlight
      ? this.getHighlightedResults(normalizedQuery, options)
      : this.getResults(normalizedQuery, options);
    if (!results.meta) results.meta = {};
    results.meta.ms = clocktime() - timestamp;
    if (initMs) results.meta.init = initMs;
    return results;
  }

  initialize() {
    if (this.keys && this.mappings) return;
    const timestamp = clocktime();
    const mappings = {};
    const keys = [];
    for (const input of this.inputs) {
      const { key, map } = AI.map(input);
      if (key !== input || map) {
        const info = {};
        if (key !== input) info.value = input;
        if (map) info.map = map;
        mappings[key] = info;
      }
      keys.push(key);
    }
    this.mappings = mappings;
    this.keys = keys;
    delete this.inputs;
    return clocktime() - timestamp;
  }

  getResults(query, options) {
    const matchGroups = this.getMatchGroups(
      query,
      options.limit,
      AI.compileRegex,
      AI.compileSplitRegex,
      false
    );
    const results = this.collateMatchedGroups(matchGroups, options);
    return results;
  }

  getHighlightedResults(query, options) {
    const matchGroups = this.getMatchGroups(
      query,
      options,
      AI.compileCapturingRegex,
      AI.compileCapturingSplitRegex,
      true
    );
    const results = this.collateHighlightedMatchedGroups(matchGroups, options);
    return results;
  }

  getMatchGroups(
    query,
    options,
    compileRegex,
    compileSplitRegex,
    returnMatches
  ) {
    const fullRegex = compileRegex(query);
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
        fullMatches.push(returnMatches ? match : key);
        if (fullMatches.length >= options.limit) return groups;
      } else {
        fullMidMatches.push(returnMatches ? match : key);
      }
      matched.add(key);
    }
    const fullCount = fullMatches.length + fullMidMatches.length;
    if (fullCount >= options.limit) return groups;
    const splitRegex = compileSplitRegex(query);
    groups.meta.patterns.split = splitRegex;
    for (const key of this.keys) {
      if (matched.has(key)) continue;
      const match = key.match(splitRegex);
      if (!match) continue;
      if (match.index === 0) {
        splitMatches.push(returnMatches ? match : key);
        if (fullCount + splitMatches.length >= options.limit) return groups;
      } else {
        splitMidMatches.push(returnMatches ? match : key);
      }
    }
    return groups;
  }

  collateMatchedGroups(matchGroups, options) {
    let results = AI.concatMatchGroups(matchGroups, options.limit);
    results = results.map(key => (this.mappings[key] || {}).value || key);
    results.meta = matchGroups.meta;
    return results;
  }

  collateHighlightedMatchedGroups(matchGroups, options) {
    let results = AI.concatMatchGroups(matchGroups, options.limit);
    let open, close;
    if (options.highlight.length === 2) {
      open = options.highlight[0];
      close = options.highlight[1];
    } else {
      open = close = options.highlight;
    }
    const mappings = this.mappings;
    results = results.map(match =>
      AI.highlightMatch(match, mappings[match.input], open, close)
    );
    results.meta = matchGroups.meta;
    return results;
  }

  static highlightMatch(match, mapping, open, close) {
    const value = mapping && mapping.value ? mapping.value : match.input;
    const map = mapping && mapping.map ? mapping.map : undefined;
    const spans = AI.getHighlightedSpans(match, value);
    if (map) AI.applySpanMaps(spans, map);
    const display = AI.highlightSpans(value, spans, open, close);
    const result = { display, value };
    return result;
  }

  static getHighlightedSpans(match, value) {
    const spans = [match.index].concat(match.slice(1).map(m => m.length));
    return spans;
  }

  static applySpanMaps(spans, map) {
    if (map.constructor.name === 'Int8Array') {
      AI.applySpanMap(spans, map);
    } else {
      for (let i = map.length - 1; i >= 0; i--) {
        AI.applySpanMap(spans, map[i]);
      }
    }
  }

  static applySpanMap(spans, map) {
    let span = 0;
    let offset = 0;
    for (let c = 0; c < map.length; c++) {
      if (c >= spans[span] + offset) {
        offset += spans[span];
        span++;
        if (span >= spans.length) break;
      }
      spans[span] += map[c];
    }
  }

  static highlightSpans(value, spans, open, close) {
    let index = spans[0];
    let result = value.substring(0, index);
    let highlighting = false;
    for (let i = 1; i < spans.length; i++) {
      const length = spans[i];
      if (!length) continue;
      const span = value.substring(index, index + length);
      if (highlighting && i % 2 === 0) {
        result += `${close}${span}`;
        highlighting = false;
      } else if (!highlighting && i % 2 === 1) {
        result += `${open}${span}`;
        highlighting = true;
      } else {
        result += span;
      }
      index += length;
    }
    if (highlighting) result += close;
    if (index !== value.length) result += value.substring(index);
    return result;
  }

  static concatMatchGroups(matchGroups, limit) {
    let results = [];
    for (const group of [
      matchGroups.full,
      matchGroups.fullMid,
      matchGroups.split,
      matchGroups.splitMid
    ]) {
      if (!group) continue;
      results = results.concat(group);
      if (results.length >= limit) break;
    }
    return results.slice(0, limit);
  }

  static map(input) {
    let map;
    let key = input;
    for (const mapper of [
      AI.mapDiacritics,
      AI.mapNonBreakingPunctuation,
      AI.mapSplitCasing
    ]) {
      const step = mapper(key);
      key = step.key;
      map = AI.mergeMaps(map, trimArray(step.map));
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
    if (a.constructor.name !== 'Int8Array') {
      a.push(b);
      return a;
    }
    return [a, b];
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
    const pattern = `\\b${words.join('.*?\\b')}`;
    return new RegExp(pattern, 'i');
  }

  static compileSplitRegex(query) {
    const words = query.split(/\s+/);
    const pattern = `\\b(${words
      .map(word => Array.from(word).join('(?:|.*?\\b)'))
      .join('.*?\\b')})`;
    return new RegExp(pattern, 'i');
  }

  static compileCapturingRegex(query) {
    const words = query.split(/\s+/);
    const pattern = `\\b(${words.join(')(.*?\\b)(')})`;
    return new RegExp(pattern, 'i');
  }

  static compileCapturingSplitRegex(query) {
    const words = query.split(/\s+/);
    const pattern = `\\b(${words
      .map(word => Array.from(word).join(')(|.*?\\b)('))
      .join(')(.*?\\b)(')})`;
    return new RegExp(pattern, 'i');
  }
}

module.exports = AI;
