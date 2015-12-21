var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 * Create a new FilterSpec class given a Filter specification
 * @param {Object} spec A description of a set of filters
 */
module.exports = function FilterSpec(spec) {

  /**
   * Convert compact format { foo: function }
   * to advanced format:    { foo: { filter: function } }
   */
  Object.keys(spec).forEach(function(k) {
    if (typeof spec[k] === 'function') {
      spec[k] = {
        filter: spec[k]
      };
    }
  });

  /**
   * Create a filter class from the supplied spec. Instances of
   * this class can then be created and values set on them.
   */
  var filter = function Filter(set) {
    this._data = {};
    if (set) this.set(set);
    EventEmitter.call(this);
  };
  util.inherits(filter, EventEmitter);

  /**
   * Returns meta data from the spec.
   * @param  {String} name part of the spec to return meta data from
   * @return {Object} The meta data
   *
   * If name is not supplied, returns all meta data.
   */
  filter.meta = function meta(name) {
    if (typeof name === 'undefined') {
      var meta = {};
      Object.keys(spec).forEach(function(name) {
        meta[name] = filter.meta(name);
      });
      return meta;
    } else {
      return spec[name].meta || {};
    }
  };

  /**
   * Remove a filter value
   * @param {String} k The key of the filter value to remove
   */
  filter.prototype.unset = function unset() {
    var changed = false;

    Array.prototype.slice.call(arguments).forEach(function(arg){
      if (!Array.isArray(arg)) arg = [ arg ];
      arg.forEach(function(k){
        if (this._data.hasOwnProperty(k)) {
          changed = true;
          delete this._data[ k ];
        }
      }.bind(this));
    }.bind(this));

    if (changed) this.emit('change');
    return this;
  };

  /**
   * Clear all filter values
   */
  filter.prototype.clear = function clear() {
    var changed = !!Object.keys(this._data).length;
    this._data = {};
    if (changed) this.emit('change');
    return this;
  };

  /**
   * Set a filter value
   * @param {String}   key   Key of filter value to set
   * @param {anything} value Value to set
   *
   * If setting multiple values at the same time, just
   * pass a single Object of key/values.
   */
  filter.prototype.set = function set() {
    var items = {};
    if (arguments.length === 1) {
      items = arguments[0];
    } else {
      items[arguments[0]] = arguments[1];
    }

    var changed = false;
    Object.keys(items).forEach(function(key) {
      var value = items[key];

      if (!spec.hasOwnProperty(key)) {
        throw new Error(`There is no filter spec for ${key}`);
      }

      if (this._data[key] !== value) {
        changed = true;
      }
      this._data[key] = value;

      /**
       * Although we don't need to call the filter function here,
       * we will do so in case the data passed was invalid,
       * triggering a throw now, rather than at query build time.
       */
      spec[key].filter(items[key]);
    }.bind(this));

    if (changed) this.emit('change');

    return this;
  };

  /**
   * Returns a representation of this filters set values which can
   * be saved and used in the constructor when creating a new copy
   * of this filter.
   *
   * @return {Object} All of the filters currently set keys/values
   */
  filter.prototype.save = function save() {
    return this._data;
  };

  /**
   * Returns a mongo query matching the spec and supplied
   * filter values
   *
   * @param  {Object} query Optional query to merge in
   * @return {Object}       The mongo query
   */
  filter.prototype.query = function query(query) {
    var queries = [];

    if (query) queries.push(query);

    Object.keys(spec).forEach(function(key) {
      if (!this._data.hasOwnProperty(key)) return;
      var query = spec[key].filter(this._data[key]);
      queries.push(query);
    }.bind(this));

    var compact = {};
    queries.forEach(function(query) {
      Object.keys(query).forEach(function(k) {
        if (compact.hasOwnProperty(k)) compact = null;
        if (compact === null) return;
        compact[k] = query[k];
      });
    });

    return compact ? compact : {
      $and: queries
    };
  };

  return filter;
};
