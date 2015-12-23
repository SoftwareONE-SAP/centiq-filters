/**
 * Create a new Filter class given a Filter specification
 * @param {Object} spec A description of a set of filters
 */
Filter = function Filter(spec) {

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
    this._reset = {};
    if (set) {
      Object.keys(set).forEach(function(k){
        this._reset[k] = {
          enabled: true,
          value: EJSON.clone(set[k])
        };
      }.bind(this));
      this.set(set);
    }
    EventEmitter.call(this);
  };
  inherits(filter, EventEmitter);

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

  filter.prototype.reset = function() {
    var changed = !EJSON.equals(this._data, this._reset);
    this._data = EJSON.clone(this._reset);
    if (changed) this.emit('change');
  };

  /**
   * Remove a filter value
   * @param {String} k The key of the filter value to remove
   */
  filter.prototype.unset = function unset() {
    var changed = false;

    Array.prototype.slice.call(arguments).forEach(function(arg) {
      if (!Array.isArray(arg)) arg = [arg];
      arg.forEach(function(k) {
        if (this._data.hasOwnProperty(k)) {
          changed = true;
          delete this._data[k];
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
   * Retrieve a saved filter value
   */
  filter.prototype.get = function get(name) {
    if (!this._data.hasOwnProperty(name)) return undefined;
    return EJSON.clone(this._data[ name ].value);
  },

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
        throw new Error("There is no filter spec for " + key);
      }

      if (this._data.hasOwnProperty(key)) {
        if (!EJSON.equals(this._data[key].value, value)) {
          changed = true;
        }
      } else {
        changed = true;
        this._data[key] = {
          enabled: true
        };
      }

      this._data[key].value = EJSON.clone(value);

      /**
       * Although we don't need to call the filter function here,
       * we will do so in case the data passed was invalid,
       * triggering a throw now, rather than at query build time.
       */
      spec[key].filter(this._data[key].value);
    }.bind(this));

    if (changed) this.emit('change');

    return this;
  };

  /**
   * Return if a particular filter is enabled
   */
  filter.prototype.enabled = function enabled(name) {
    if (!this._data.hasOwnProperty(name)) return false;
    return this._data[ name ].enabled;
  };

  /**
   * Enable a disabled filter value
   */
  filter.prototype.enable = function enable() {
    var changed = false;

    Array.prototype.slice.call(arguments).forEach(function(arg) {
      if (!Array.isArray(arg)) arg = [arg];
      arg.forEach(function(k) {
        if (!this._data.hasOwnProperty(k)) return;
        if (this._data[k].enabled) return;
        this._data[k].enabled = true;
        changed = true;
      }.bind(this));
    }.bind(this));

    if (changed) this.emit('change');
    return this;
  };

  /**
   * Disable an enabled filter value
   */
   filter.prototype.disable = function disable() {
     var changed = false;

     Array.prototype.slice.call(arguments).forEach(function(arg) {
       if (!Array.isArray(arg)) arg = [arg];
       arg.forEach(function(k) {
         if (!this._data.hasOwnProperty(k)) return;
         if (!this._data[k].enabled) return;
         this._data[k].enabled = false;
         changed = true;
       }.bind(this));
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
    var save = {};
    Object.keys(this._data).forEach(function(k) {
      if (this._data[k].enabled) {
        save[k] = EJSON.clone(this._data[k].value);
      }
    }.bind(this));
    return save;
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
      if (this._data[key].enabled) {
        var query = spec[key].filter(this._data[key].value);
        queries.push(query);
      }
    }.bind(this));

    var compact = {};
    queries.forEach(function(query) {
      Object.keys(query).forEach(function(k) {
        if (compact === null) return;
        if (compact.hasOwnProperty(k)) return compact = null;
        compact[k] = query[k];
      });
    });

    return compact ? compact : {
      $and: queries
    };
  };

  return filter;
};

/**
 * A function for client+server side inheritance. Logic stolen from
 * MeteorSpark:util
 */
var inherits = (function () {
  if (Meteor.isServer) {
    return Npm.require('util').inherits;
  } else if (typeof Object.create === 'function') {
    return function (ctor, superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    };
  } else {
    return function (ctor, superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    };
  }
})();
