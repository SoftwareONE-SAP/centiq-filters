# Meteor Filters

We need a way to let a user specify the content of a Mongo query, for filtering purposes. For example, when displaying a list of products to a user, they might want to filter by price and when the product was added:

```javascript
{
  price: { $gte: 3 },
  added: { $lt: new Date(Date.now()-86400000) },
}
```

This Meteor package allows us to specify a "filter specification" containing information on exactly what values an end-user is allowed to supply for a particular filter.

## Example Usage

```javascript
var ProductFilter = Filter.create({
  filters: {
    MinPrice: function (minPrice) {
      return {
        price: {
          $gte: minPrice
        }
      };
    },
    AddedBefore: function (addedBefore) {
      return {
        added: {
          $lt: addedBefore
        }
      };
    }
  }
});

var filter = new ProductFilter();

filter.set({
  MinPrice: 3
});
filter.set({
  AddedBefore: new Date(Date.now()-86400000)
});

var mongoQuery = filter.query();
// {
//   price: { '$gte': 3 },
//   added: { '$lt': Date('Sun Dec 20 2015 12:29:19 GMT+0000 (GMT)') }
// }

var serialized = filter.save();
// {
//   MinPrice: 3,
//   AddedBefore: Date('Sun Dec 20 2015 12:29:19 GMT+0000 (GMT)')
// }
```

The `serialized` object can be used to recreate a filter with the same options:

```javascript
var filter = new ProductFilter(serialized);
```

If any of the values in the `serialized` object are invalid, then an `Error` object is thrown.

We also provide a number of "filter factory functions" in the Filter Object so you don't need to write snippets of Mongo queries. The above `ProductFilter` could be rewritten as:

```javascript
var ProductFilter = Filter.create({
  filters: {
    MinPrice:    Filter.Gte('price'),
    AddedBefore: Filter.Lt('added')
  }
});
```

As well as being less code, these factory functions do additional validation. For example, `Filter.Gte` and `Filter.Lt` both check that the value passed in is either a `Date` Object or a `Number`. If not, they throw an `Error` object.

You may want to write your own such factory functions for common filter types. For example, if you need to filter based on a date being between two other dates:

```javascript
var DateBetweenFilter = function DateBetweenFilterFactory(field) {
  return function DateBetweenFilter(value) {

    if (typeof value !== 'object'
      || !(value.before instanceof Date)
      || !(value.after  instanceof Date)
    ) {
      throw new Error('Invalid value passed to DateBetweenFilter');
    }

    var query = {};
    query[field] = {
      $gt: value.after,
      $lt: value.before
    };

    return query;
  };
};

var ProductFilter = Filter.create({
  filters: {
    MinPrice:     Filter.Gte('price'),
    AddedBetween: DateBetweenFilter('added'),
  }
});

var filter = new ProductFilter();
filter.set({
  MinPrice: 3,
  AddedBetween: {
    after:  new Date(Date.now()-86400000),
    before: new Date(Date.now()+86400000)
  }
});

var mongoQuery = filter.query();
// {
//   price: { '$gte': 3 },
//   added: {
//     '$gt': Date('Sun Dec 20 2015 12:29:19 GMT+0000 (GMT)')
//     '$lt': Date('Sun Dec 22 2015 12:29:19 GMT+0000 (GMT)')
//   }
// }

var serialized = filter.save();
// {
//   MinPrice: 3,
//   AddedBetween: {
//     after:  Date('Sun Dec 20 2015 12:29:19 GMT+0000 (GMT)')
//     before: Date('Sun Dec 22 2015 12:29:19 GMT+0000 (GMT)')
//   }
// }
```

## Filter Class

The spec passed to the constructor contains a series of key/values, where the key is the name for this part of the filter, and the value is a filter function which converts a value into a Mongo query. Instead of the value being a function, it can also be an Object containing a "filter" item. These are equivalent:

```javascript
var ProductFilter = Filter.create({
  filters: {
    MinPrice: Filter.Gte('price')
  }
});

var ProductFilter = Filter.create({
  filters: {
    MinPrice: {
      filter: Filter.Gte('price')
    }
  }
});

var ProductFilter = Filter.create({
  filters: [
    {
      MinPrice: Filter.Gte('price')
    }
  ]
});

var ProductFilter = Filter.create([
  {
    MinPrice: Filter.Gte('price')
  }
]);
```

The first version is compact, but the second version allows us to store more things alongside the filter, such as arbitrary useful meta data. The third version uses an Array. The only purpose of this is so we can recover the order that the filters were defined in when calling `ProductFilter.names()`. The fourth version is a
more compact version of the third. So why the third? In case we
want to pass things other than `filters`, such as `type`:

As well as passing `filters` to Filter.create, you can also pass
an optional `type` parameter:

```javascript
var ProductFilter = Filter.create({
  type: 'Foo',
  filters: {
    ...
  }
});
```

If you do this, then you can call the type function on the filter
spec object, or any filters created from it, to get that type. This allows you to uniquely identify filter specs without having to pass
names around:

```javascript
ProductFilter.type() === 'Foo'; // true
var filter = new ProductFilter();
filter.type() === 'Foo'; // true
```

Here we store some meta data information about a "template" that we might want to use to let the user select what min-price to filter on:

```javascript
var ProductFilter = Filter.create({
  filters: {
    MinPrice: {
      filter: Filter.Gte('price'),
      meta: {
        template: Template.minPriceFilterTemplate
      }
    }
  },
});
```

This meta data can be extracted from the ProductFilter using either of the following methods:

```javascript
var minPriceTemplate = ProductFilter.meta('MinPrice').template;
var minPriceTemplate = ProductFilter.meta().MinPrice.template;
```

"template" is arbitrary. You can store whatever data you want in there.

Another way of storing meta data is to store it as a value on the actual filter function. The two meta data locations are merged at the top level with the one discussed first taking priority. So for example:

```javascript
function CustomFilter (field) {
  var filter_func = function (value) {
    var q = {};
    q[ field ] = value * 2;
    return q;
  };
  filter_func.meta = {
    foo: 123,
    bar: 234,
  };
  return filter_func;
};

var ProductFilter = Filter.create({
  filters: {
    MinPrice: {
      filter: CustomFilter('price'),
      meta: {
        bar: 789,
      }
    }
  }
});

ProductFilter.meta('MinPrice') ==
{
  foo: 123,
  bar: 789,
}
```

"meta" is a setter as well as a getter. You can shallow-merge in additional meta data after the spec is created. For example:

```javascript
var ProductFilter = Filter.create({
  filters: {
    MinPrice: CustomFilter('price')
  }
});
ProductFilter.meta('MinPrice', {
  bar: 789
});
```

To set multiple values at once:

```javascript
var ProductFilter = Filter.create({
  filters: {
    MinPrice: CustomFilter('price'),
    MaxPrice: SomeOtherFilter('price'),
  }
});
ProductFilter.meta({
  MinPrice: { bar: 789 },
  MaxPrice: { foo: 'abc' },
});
```

Another optional item you can pass is `beforeSet`. This is a `function`
which takes the value being set and can run arbitrary tasks before the set happens. It can also optionally change the value being set. For
example

```javascript
var ProductFilter = Filter.create({
  filters: {
    MinPrice: {
      filter: CustomFilter('price'),
      beforeSet: function (value, callback) {
        var low = ProductFilter.meta('MinPrice').low;
        if (value < low) {
          callback(low);
        }
      }
    }
  }
});
```

You don't have to run the callback to change the value, but if you do want to do that, it must happen immediately during the same event loop tick. I.e, this wouldn't work:

```javascript
if (value < low) {
  setTimeout(function(){
    callback(low);
  }, 1);
}
```

There is also a similar `beforeUnset` function. This is not passed any arguments at all. You can access `this.name` and `this.filter`

You can call the `names` function on either the ProductFilter class or an instance of it in order to get a list of names of filters which are available. If you passed the Filter spec as an Array, then the values will be returned in the same order. For example:

```javascript
var ProductFilter = Filter.create([
  { First:  ... },
  { Second: ... },
]);
var filter = new ProductFilter();

ProductFilter.names() == ['First', 'Second'];
filter.names() == ['First', 'Second'];
```

If we hadn't used Array syntax when creating the ProductFilter class, then the returned Array may have been `['Second', 'First']`

Now we have ProductFilter, we want to create an instance of it which we can set values for MinPrice on.

```javascript
var filter = new ProductFilter({ MinPrice: 3 });
```

Here we instantiated a filter object with MinPrice set to 3. We could have refrained from passing an Object to not set a value for MinPrice, and then set it later with one of these two calls:

```javascript
var filter = new ProductFilter();
filter.set('MinPrice', 3);
filter.set({ 'MinPrice': 3 });
```

The second notation is useful when you want to set more than one value at the same time. There is an "unset" function to remove one or more values:

```javascript
filter.unset('MinPrice');
filter.unset('Multiple', 'Values');
filter.unset(['Multiple', 'Values', 'In', 'An', 'Array']);
```

To clone a filter object:

```javascript
var newFilter = filter.clone();
```

To automatically set new values to a cloned version of a filter, you can treat `clone` like `set`:

```
var filter = new ProductFilter({ MinPrice: 3 });
var newFilter = filter.clone({ MaxPrice: 10 });
```

After running the above, newFilter would contain a filter with MinPrice set to 3 and MaxPrice set to 10.

To clear all values:

```javascript
filter.clear();
```

To reset the object data to what it was when it was originally constructed:

```javascript
filter.reset();
```

If any arguments are passed to `clear` or `reset`, they are proxied through to `set` after the `clear` or `reset` operation is performed. A call to these functions will only trigger a maximum of one `change` event, and only if the final result is different to the original.

To get the data which has been set on the filter:

```javascript
filter.set('Foo', 123);
filter.set('Bar', [1, 2, 3]);
var result = filter.save();
result == {
  Foo: 123,
  Bar: [1, 2, 3]
}
```

To get the mongo query:

```javascript
var mongoQuery = filter.query();
```

## Reactivity

The `save`, `query` and `get` functions are reactive. So if you do this:

```javascript
var filter = new ProductFilter({ MinPrice: 3 });

Tracker.autorun(function(){
  console.log("Filter query:", filter.query());
});
```

The filter query will be printed to the console immediately, *and* whenever it is changed.

## Filter Factories

#### Filter.Eq

A direct "equals" comparison. [$eq](https://docs.mongodb.org/v3.0/reference/operator/query/eq/)

|               | Type                 | Description |
|---------------|----------------------|-------------|
| Factory  arg1 | `String`             | Field name  |
| Function arg1 | `String` or `Number` | Value       |

```javascript
var filter = Filter.Eq('price');
var result = filter(3);
result == {
  'price': 3
};
```

#### Filter.Ne

A direct "not equals" comparison. [$eq](https://docs.mongodb.org/v3.0/reference/operator/query/ne/)

|               | Type                 | Description |
|---------------|----------------------|-------------|
| Factory  arg1 | `String`             | Field name  |
| Function arg1 | `String` or `Number` | Value       |

```javascript
var filter = Filter.Ne('price');
var result = filter(3);
result == {
  'price': { $ne: 3 }
};
```

#### Filter.Gt

A "greater than" comparison.
[$gt](https://docs.mongodb.org/v3.0/reference/operator/query/gt/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = Filter.Gt('price');
var result = filter(3);
result == {
  'price': {
    $gt: 3
  }
};
```

#### Filter.Gte

A "greater than or equal to" comparison.
[$gte](https://docs.mongodb.org/v3.0/reference/operator/query/gte/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = Filter.Gte('price');
var result = filter(3);
result == {
  'price': {
    $gte: 3
  }
};
```

#### Filter.Lt

A "less than" comparison.
[$lt](https://docs.mongodb.org/v3.0/reference/operator/query/lt/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = Filter.Lt('price');
var result = filter(3);
result == {
  'price': {
    $lt: 3
  }
};
```

#### Filter.Lte

A "less than or equal to" comparison.
[$lte](https://docs.mongodb.org/v3.0/reference/operator/query/lte/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = Filter.Lte('price');
var result = filter(3);
result == {
  'price': {
    $lte: 3
  }
};
```

#### Filter.In

A "must be one of" comparison.
[$in](https://docs.mongodb.org/v3.0/reference/operator/query/in/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Array`  | Value       |

```javascript
var filter = Filter.In('price');
var result = filter([2, 3, 4]);
result == {
  'price': {
    $in: [2, 3, 4]
  }
};
```

#### Filter.Nin

A "must not be one of" comparison.
[$nin](https://docs.mongodb.org/v3.0/reference/operator/query/nin/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Array`  | Value       |

```javascript
var filter = Filter.Nin('price');
var result = filter([2, 3, 4]);
result == {
  'price': {
    $nin: [2, 3, 4]
  }
};
```

#### Filter.Or

A Boolean OR filter.
[$or](https://docs.mongodb.org/v3.0/reference/operator/query/or/)

|               | Type                | Description |
|---------------|---------------------|-------------|
| Factory  arg1 | `String`            | Field name  |
| Function arg1 | `Array` OR `Object` | Value       |

```javascript
var filter = Filter.Or([
  Filter.Eq('price')(0),
  Filter.Gt('price')(4)
]);
var result = filter();
result == {
  $or: [
    { price: 0 },
    { price: { $gt: 4 } }
  ]
};
```

In the above example, we are hard coding the two values inside the factory function. This is not ideal. You can alternatively use Object notiation instead of Array notation in order to pass values through from the filter function. The following would produce the exact same result as above:

```javascript
var filter = Filter.Or({
  ExactPrice: Filter.Eq('price'),
  GtPrice:    Filter.Gt('price')
});
var result = filter({
  ExactPrice: 0,
  GtPrice:    4
});
```

You can create queries of arbitrary depth using this method:

```javascript
var filter = Filter.Or({
  price:  Filter.Or({
    exact: Filter.Eq('price'),
    above: Filter.Gt('price'),
  }),
  status: Filter.Eq('status'),
});

var result = filter({
  price: {
    exact: 10,
    above: 20
  },
  status: 'active'
});

result == {
  $or: [
    {
      $or: [
        {
          price: 10,
        },
        {
          price: { $gt: 20 }
        }
      ]
    },
    {
      status: 'active',
    }
  ]
};
```

It would also have been possible to shift the "active" status into the factory function above, so it doesn't need to be specified when the filter function is called:

```javascript
var filter = Filter.Or({
  price:  Filter.Or({
    exact: Filter.Eq('price'),
    above: Filter.Gt('price'),
  }),
  status: Filter.Eq('status')('active'),
});

var result = filter({
  price: {
    exact: 10,
    above: 20
  }
});
```

#### Filter.And

A Boolean AND filter.
[$and](https://docs.mongodb.org/v3.0/reference/operator/query/and/)

|               | Type                | Description |
|---------------|---------------------|-------------|
| Factory  arg1 | `String`            | Field name  |
| Function arg1 | `Array` OR `Object` | Value       |

See [Filter.Or](#orfilter). It works exactly the same except uses $and instead of $or

#### Filter.Not

A "must not be" comparison.
[$not](https://docs.mongodb.org/v3.0/reference/operator/query/not/)

|               | Type      | Description |
|---------------|-----------|-------------|
| Factory  arg1 | `String`  | Field name  |
| Function arg1 | anything  | Value       |

```javascript
var filter = Filter.Not(Filter.Eq('price'));
var result = filter(5);
result == {
  'price': {
    $not: {
      $eq: 5
    }
  }
};
```

The filter function provided by the Filter.Not factory function, passes the value supplied to its child.

The Mongo $not filter is strange in that it is incompatible with certain queries. The Filter.Not factory function tries to restructure things to make them work. For example, the following 3 are invalid:

```javascript
1. { price: { $not: 3 } }
2. { name:  { $not: { $regexp: /^A/, $options: 'i' } } }
3. { $where: { $not: someFunction } }
```

So they are converted to these valid versions:

```javascript
1. { price: { $not: { $eq: 3 } } }
2. { name:  { $not: /^A/i } }
3. { $where: function() { return !(someFunction.apply(this, arguments)) } }
```

#### Filter.Nor

A Boolean NOT OR filter.
[$nor](https://docs.mongodb.org/v3.0/reference/operator/query/nor/)

|               | Type                | Description |
|---------------|---------------------|-------------|
| Factory  arg1 | `String`            | Field name  |
| Function arg1 | `Array` OR `Object` | Value       |

See [Filter.Or](#orfilter). It works exactly the same except uses $nor instead of $or

#### Filter.Exists

A "exists" comparison.
[$exists](https://docs.mongodb.org/v3.0/reference/operator/query/exists/)

|               | Type      | Description                |
|---------------|-----------|----------------------------|
| Factory  arg1 | `String`  | Field name                 |
| Function arg1 | `Boolean` | Optional. Defaults to true |

```javascript
var filter = Filter.Exists('price');

var result = filter(false);
result == {
  'price': {
    $exists: false
  }
};

result = filter();
result == {
  'price': {
    $exists: true
  }
};
```

#### Filter.Type

A "must be of this type" comparison.
[$type](https://docs.mongodb.org/v3.0/reference/operator/query/type/)

|              | Type     | Description      |
|--------------|----------|------------------|
| Factory arg1 | `String` | Field name       |
| Factory arg2 | `Number` | Field value type |

```javascript
var filter = Filter.Type('date', 9);
var result = filter();
result == {
  'date': {
    $type: 9
  }
};
```

#### Filter.Mod

A "given this divisor, must match this remainder" comparison.
[$mod](https://docs.mongodb.org/v3.0/reference/operator/query/mod/)

|               | Type     | Description                    |
|---------------|----------|--------------------------------|
| Factory  arg1 | `String` | Field name                     |
| Function arg1 | `Object` | Contains divisor and remainder |

```javascript
var filter = Filter.Mod('price');
var result = filter({ divisor: 2, remainder: 1 });
result == {
  'price': {
    $mod: [ 2, 1 ]
  }
};
```

The above would pick out all documents where the "price" value is an odd number (1, 3, 5 etc).

#### Filter.Regex

A "must match this regular expression" comparison.
[$regex](https://docs.mongodb.org/v3.0/reference/operator/query/regex/)

|              | Type                 | Description                    |
|--------------|----------------------|--------------------------------|
| Factory arg1 | `String`             | Field name                     |
| Factory arg2 | `String` or `RegExp` | Regular expression             |
| Factory arg3 | `String`             | Optional regex specifiers      |

```javascript
var filter = Filter.Regex('name', '^A', 'i'); // or:
var filter = Filter.Regex('name', /^A/, 'i'); // or:
var filter = Filter.Regex('name', /^A/i);

var result = filter();
result == {
  'name': {
    $regex: /^A/i
  }
};
```

#### Filter.Text

A "must match this text" comparison.
[$text](https://docs.mongodb.org/v3.0/reference/operator/query/text/)

|               | Type     | Description          |
|---------------|----------|----------------------|
| Factory  arg1 | `String` | Language (optional)  |
| Function arg1 | `String` | String to search for |

```javascript
var filter = Filter.Text('en');
var result = filter('Mike Cardwell');
result == {
  $text: {
    $search:   'Mike Cardwell',
    $language: 'en'
  }
};
```

Unlike the other filter factories we've looked at up until this point, we don't specify a field name. That is because Mongo searches any field with a text index in the collection.

#### Filter.Where

A "function run on document must return true" comparison.
[$where](https://docs.mongodb.org/v3.0/reference/operator/query/where/)

|               | Type                   | Description                  |
|---------------|------------------------|------------------------------|
| Factory  arg1 | `Function` or `String` | Function to run on documents |
| Function args | anything               | All args passed to function supplied in Factory arg1  |

```javascript
var filter = Filter.Where(function(field, min){
  return this[ field ] >= min;
});
var result = filter('price', 3);
result == {
  $where: function () {
    return this.price >= 3;
  }
};
```

#### Filter.All

A "all values must be contained in doc" comparison.
[$all](https://docs.mongodb.org/v3.0/reference/operator/query/all/)

|               | Type                   | Description |
|---------------|------------------------|-------------|
| Factory  arg1 | `String`               | Field name  |
| Function arg1 | `Array`                | Values      |

```javascript
var filter = Filter.All('names');
var result = filter(['Mike', 'Cardwell']);
result == {
  names: {
    $all: [
      'Mike',
      'Cardwell'
    ]
  }
};
```

#### Filter.ElemMatch

A "at least one element query must match doc" comparison.
[$elemMatch](https://docs.mongodb.org/v3.0/reference/operator/query/elemMatch/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Object` | Queries     |

```javascript
var filter = Filter.ElemMatch('price');
var result = filter({
  $lt: 5,
  $gt: 10
});
result == {
  price: {
    $elemMatch: {
      $lt: 5,
      $gt: 10
    }
  }
};
```

#### Filter.Size

A "array must have this many items" comparison.
[$size](https://docs.mongodb.org/v3.0/reference/operator/query/size/)

|               | Type     | Description     |
|---------------|----------|-----------------|
| Factory  arg1 | `String` | Field name      |
| Function arg1 | `Number` | Number of items |

```javascript
var filter = Filter.Size('names');
var result = filter(2);
result == {
  names: {
    $size: 2
  }
};
```

### Testing

There are a tests for the filter factory functions. You can run them by doing this:

```bash
cd tests
npm install
npm test
```
