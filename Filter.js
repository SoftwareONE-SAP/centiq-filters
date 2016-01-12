/**
 * Create a new Filter class given a Filter specification
 * @param {Object} spec A description of a set of filters
 */
Filter = typeof Filter === 'undefined' ? {} : Filter;

Filter.create = function FilterCreateSpec(spec) {

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
      'beforeEnable',
      'beforeDisable',
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
    this._emit_changes = {
      status: true,
      changed: false,
    };
    if (set) {
      Object.keys(set).forEach(function(k){
        this._reset[k] = {
          enabled: true,
          value: EJSON.clone(set[k])
        };
      }.bind(this));
      this.set(set);
    }
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
   * Returns meta data from the spec.
   * @param  {String} name part of the spec to return meta data from
   * @return {Object} The meta data
   *
   * If name is not supplied, returns all meta data.
   */
  filter.meta = filter.prototype.meta = function meta(name) {
    if (typeof name === 'undefined') {
      var meta = {};
      Object.keys(spec).forEach(function(name) {
        meta[name] = filter.meta(name);
      });
      return meta;
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

    var from   = this._data;
    var to     = this._reset;
    this._data = EJSON.clone(to);

    if (set) {
      // Temporarily disable emit so a change event isn't triggered
      var emit = this.emit;
      this.emit = function(){};
      this.set(set);
      this.emit = emit;
      to = this._data;
    }

    if (!EJSON.equals(from, to)) this._emitChange();
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
          if (spec[k].hasOwnProperty('beforeUnset')) {
            spec[k].beforeUnset.call({ name: k, filter: this });
          }
          changed = true;
          delete this._data[k];
        }
      }.bind(this));
    }.bind(this));

    if (changed) this._emitChange();
    return this;
  };

  /**
   * Clear all filter values
   */
  filter.prototype.clear = function clear() {

    var set = arguments[0];
    if (arguments.length > 1) {
      set = {};
      set[arguments[0]] = arguments[1];
    }

    var from   = this._data;
    var to     = {};
    this._data = to;

    if (set) {
      // Temporarily disable emit so a change event isn't triggered
      var emit = this.emit;
      this.emit = function(){};
      this.set(set);
      this.emit = emit;
      to = this._data;
    }

    if (!EJSON.equals(from, to)) this._emitChange();
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

    this._stopEmittingChanges();

    var changed = false;
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
      spec[key].filter.call({
        name:   key,
        filter: this,
      }, this._data[key].value);

    }.bind(this));

    if (changed) this._emitChange();

    this._restartEmittingChanges();

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

    this._stopEmittingChanges();

    Array.prototype.slice.call(arguments).forEach(function(arg) {
      if (!Array.isArray(arg)) arg = [arg];
      arg.forEach(function(k) {
        if (this._data[k] && this._data[k].enabled) return;

        if (spec[k].hasOwnProperty('beforeEnable')) {
          spec[k].beforeEnable.call({ name: k, filter: this });
          if (this._data[k] && this._data[k].enabled) return;
        }

        this._data[k].enabled = true;
        changed = true;
      }.bind(this));
    }.bind(this));

    if (changed) this._emitChange();

    this._restartEmittingChanges();

    return this;
  };

  /**
   * Disable an enabled filter value
   */
   filter.prototype.disable = function disable() {
     var changed = false;

     this._stopEmittingChanges();

     Array.prototype.slice.call(arguments).forEach(function(arg) {
       if (!Array.isArray(arg)) arg = [arg];
       arg.forEach(function(k) {
         if (!this._data[k] || !this._data[k].enabled) return;

         if (spec[k].hasOwnProperty('beforeDisable')) {
           spec[k].beforeDisable.call({ name: k, filter: this });
           if (!this._data[k] || !this._data[k].enabled) return;
         }

         this._data[k].enabled = false;
         changed = true;
       }.bind(this));
     }.bind(this));

     if (changed) this._emitChange();

     this._restartEmittingChanges();

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
    this._tracker().depend();

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
    this._tracker().depend();

    var queries = [];

    if (query) queries.push(query);

    Object.keys(spec).forEach(function(key) {
      if (!this._data.hasOwnProperty(key)) return;
      if (this._data[key].enabled) {
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

  /**
   * Lazy load a Tracker.Depenency
   */
  filter.prototype._tracker = function () {
    if (!this.hasOwnProperty('_dependency')) {
      this._dependency = new Tracker.Dependency();
    }
    return this._dependency;
  },

  filter.prototype._emitChange = function _emitChange() {
    if (this._emit_changes.status) {
      this._tracker().changed();
    }
    this._emit_changes.changed = true;
  };

  filter.prototype._stopEmittingChanges = function _stopEmittingChanges() {
    this._emit_changes = {
      status:  false,
      changed: false,
    };
  };

  filter.prototype._restartEmittingChanges = function _restartEmittingChanges() {
    if (this._emit_changes.status) return;
    this._emit_changes.status = true;
    this._emitChange();
  };

  return filter;
};
