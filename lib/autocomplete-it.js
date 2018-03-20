class AutocompleteIt {
  constructor(values, options) {
    if (values === null || values === undefined) {
      throw new TypeError(`Values cannot be ${values}.`);
    }
    this._values = values.slice();
    this._options = options || {};
  }

  match(query, options) {
    const regex = new RegExp(`^${query}`, 'i');
    return this._values.filter(v => v.match(regex));
  }
}

module.exports = AutocompleteIt;
