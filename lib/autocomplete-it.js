class AutocompleteIt {
  constructor(values, options) {
    if (values === null || values === undefined) {
      throw new TypeError(`Values cannot be ${values}.`);
    }
    this.values = values.slice();
    this.options = options || {};
  }
}

module.exports = AutocompleteIt;
