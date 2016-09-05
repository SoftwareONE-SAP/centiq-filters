/**
 * Create a new Filter class given a Filter specification
 * @param {Object} spec A description of a set of filters
 */
Filter = typeof Filter === 'undefined' ? {} : Filter;

Filter.create = function FilterCreateSpec(spec) {

  /**
   * Compact "{ type: T, filters: F }" to "F" whilst extracting the "type" item
   */
  var type = null;
  if (!Array.isArray(spec)) {
    type = spec.type || null;
    spec = spec.filters;
    if (!spec) throw "Missing filter definitions";
  }

  var names = [];
  if (Array.isArray(spec)) {
    spec = spec.reduce(function(o, item){
      Object.keys(item).forEach(function(k){
        o[ k ] = item[ k ];
        names.push(k);
      });
      return o;
    }, {});
  } else {
    names = Object.keys(spec);
  }

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

    /**
     * Handle "before" functions set on the function
     */
    [
      'beforeSet',
      'beforeUnset',
    ].forEach(function(name){
      if (typeof spec[k].filter[name] !== 'function') return;
      var funcs = [ spec[k].filter[name] ];
      delete spec[k].filter[name];
      if (typeof spec[k][name] === 'function') {
        funcs.push(spec[k][name]);
      }
      spec[k][name] = function () {
        for (var i = 0; i < funcs.length; ++i) {
          funcs[i].apply(this, arguments);
        }
      };
    });
  });

  /**
   * Create a filter class from the supplied spec. Instances of
   * this class can then be created and values set on them.
   */
  var filter = function Filter(set) {
    this._data = {};
    this._reset = {};
    this._tracking = {
      paused:   0,
      queue:    {},
      trackers: {},
    };
    if (set) {
      Object.keys(set).forEach(function(k){
        this._reset[k] = {
          value: EJSON.clone(set[k])
        };
      }.bind(this));
      this.set(set);
    }
  };

  /**
   * Returns the "type" of filter if one was specified
   */
  filter.type = filter.prototype.type = function () {
    return type;
  };

  /**
   * Returns a list of names from the filter spec. They are
   * ordered in the same way they were passed if an Array was
   * passed
   */
  filter.names = filter.prototype.names = function () {
    return [].concat(names);
  };

  /**
   * Get or set meta data on the spec.
   *
   * If passed no arguments, will return all meta data.
   *
   * If passed a single String argument, will return the meta data
   * for that particular filter.
   *
   * If passed a String and an Object, will do a shallow merge of the
   * Object into the existing meta data for the filter matching that
   * String.
   *
   * For merging in multiple meta data values, pass a single Object
   * where filter name is the key and meta data as an Object to merge
   * is the value.
   */
  filter.meta = filter.prototype.meta = function meta(name, value) {
    if (typeof name === 'undefined') {
      var meta = {};
      Object.keys(spec).forEach(function(name) {
        meta[name] = filter.meta(name);
      });
      return meta;
    } else if (typeof name === 'object') {
      Object.keys(name).forEach(function(k){
        filter.meta(k, name[k]);
      });
    } else if (typeof value === 'object') {
      Object.keys(value).forEach(function(k){
        if (!spec[name].filter.meta) {
          spec[name].filter.meta = {};
        }
        spec[name].filter.meta[k] = value[k];
      });
    } else {
      var meta = spec[name].filter.meta || {};
      if (spec[name].hasOwnProperty('meta')) {
        Object.keys(spec[name].meta).forEach(function(k){
          meta[k] = spec[name].meta[k];
        });
      }
      return meta;
    }
  };

  filter.prototype.reset = function() {

    var set = arguments[0];
    if (arguments.length > 1) {
      set = {};
      set[arguments[0]] = arguments[1];
    }

    var from = EJSON.clone(this._data);
    var to   = EJSON.clone(this._reset);
    if (set) {
      Object.keys(set).forEach(function(k){
        to[k] = { value: EJSON.clone(set[k]) };
      });
    }

    this._pauseTracking();

    Object.keys(to).forEach(function(k){
      this.set(k, to[k].value);
    }.bind(this));

    Object.keys(from).forEach(function(k){
      if (to.hasOwnProperty(k)) return;
      this.unset(k);
    }.bind(this));

    this._continueTracking();

    return this;
  };

  /**
   * Remove a filter value
   * @param {String} k The key of the filter value to remove
   */
  filter.prototype.unset = function unset() {
    this._pauseTracking();

    Array.prototype.slice.call(arguments).forEach(function(arg) {
      if (!Array.isArray(arg)) arg = [arg];
      arg.forEach(function(k) {
        if (this._data.hasOwnProperty(k)) {
          if (spec[k].hasOwnProperty('beforeUnset')) {
            spec[k].beforeUnset.call({ name: k, filter: this });
          }
          delete this._data[k];
          this._trackChanged(k);
        }
      }.bind(this));
    }.bind(this));

    this._continueTracking();

    return this;
  };

  /**
   * Clear all filter values
   */
  filter.prototype.clear = function clear() {

    var set = arguments[0]||{};
    if (arguments.length > 1) {
      set = {};
      set[arguments[0]] = arguments[1];
    }

    this._pauseTracking();
    Object.keys(this._data).forEach(function(k){
      if (set && set.hasOwnProperty(k)) {
        this.set(k, set[k]);
      } else {
        this.unset(k);
      }
    }.bind(this));

    Object.keys(set).forEach(function(k){
      if (this._data.hasOwnProperty(k)) return;
      this.set(k, set[k]);
    }.bind(this));

    this._continueTracking();

    return this;
  };

  /**
   * Retrieve a saved filter value
   */
  filter.prototype.get = function get(name, reactivity) {
    if (reactivity !== false) this._trackDepend(name);
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

    this._pauseTracking();

    Object.keys(items).forEach(function(key) {
      var value = items[key];

      if (!spec.hasOwnProperty(key)) {
        throw new Error("There is no filter spec for " + key);
      }

      if (spec[key].hasOwnProperty('beforeSet')) {
        spec[key].beforeSet.call({ name: key, filter: this }, value, function(newValue){
          value = newValue;
        });
      }

      if (!this._data.hasOwnProperty(key)) {
        this._data[key] = {};
      }

      // No change?
      if (EJSON.equals(this._data[key].value, value)) return;

      this._data[key].value = EJSON.clone(value);
      this._trackChanged(key);
      changed = true;

      /**
       * Call filter function here so it throws if something invalid
       * was supplied.
       */
      spec[key].filter.call({
        name:   key,
        filter: this,
      }, this._data[key].value);

    }.bind(this));

    this._continueTracking();

    return this;
  };

  /**
   * Returns a representation of this filters set values which can
   * be saved and used in the constructor when creating a new copy
   * of this filter.
   *
   * @return {Object} All of the filters currently set keys/values
   */
  filter.prototype.save = function save(reactivity) {
    if (reactivity !== false) this._trackDepend();

    var save = {};
    Object.keys(this._data).forEach(function(k) {
      if (this._data[k].hasOwnProperty('value')) {
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
  filter.prototype.query = function query(query, reactivity) {
    if (reactivity !== false) this._trackDepend();

    var queries = [];

    if (query) queries.push(query);

    Object.keys(spec).forEach(function(key) {
      if (!this._data.hasOwnProperty(key)) return;
      if (this._data[key].hasOwnProperty('value')) {
        var query = spec[key].filter.call({
          name:   key,
          filter: this
        }, this._data[key].value);
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

  filter.prototype.clone = function () {
    var set = arguments[0];
    if (arguments.length > 1) {
      set = {};
      set[arguments[0]] = arguments[1];
    }
    if (!set) set = {};

    var cur = this.save();
    Object.keys(cur).forEach(function(k){
      if (!set.hasOwnProperty(k)) set[k] = cur[k];
    });

    var f = new filter(set);
    f._reset = this._reset;

    return f;
  };

  filter.prototype._pauseTracking = function _pauseTracking () {
    ++this._tracking.paused;
  };

  filter.prototype._continueTracking = function _continueTracking () {
    if (--this._tracking.paused > 0) return;
    Object.keys(this._tracking.queue).forEach(function(name){
      this._tracking.trackers[ name ].changed();
      delete this._tracking.queue[ name ];
    }.bind(this));
  };

  filter.prototype._trackDepend = function _trackDepend (name) {
    if (typeof name === 'undefined') name = '...ROOT...';
    if (!this._tracking.trackers.hasOwnProperty(name)) {
      this._tracking.trackers[ name ] = new Tracker.Dependency();
    }
    this._tracking.trackers[ name ].depend();
  };

  filter.prototype._trackChanged = function _trackChanged (name) {
    [ name, '...ROOT...'].forEach(function(name){
      if (!this._tracking.trackers.hasOwnProperty(name)) return;
      if (this._tracking.paused) {
        this._tracking.queue[ name ] = true;
      } else {
        this._tracking.trackers[ name ].changed();
      }
    }.bind(this));
  };

  return filter;
};
