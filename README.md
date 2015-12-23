# Meteor Filters

**WARNING** - This is a very new library and is currently in heavily active development and its API will definitely change in various backwards incompatible ways. I will remove this warning when it stabilises. Use at your own risk.

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
var ProductFilter = new Filter({
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

We also provide a number of "filter factory functions" in the Filters Object so you don't need to write snippets of Mongo queries. The above `ProductFilter` could be rewritten as:

```javascript
var ProductFilter = new Filter({
  MinPrice:    Filters.Gte('price'),
  AddedBefore: Filters.Lt('added')
});
```

As well as being less code, these factory functions do additional validation. For example, `Filters.Gte` and `Filters.Lt` both check that the value passed in is either a `Date` Object or a `Number`. If not, they throw an `Error` object.

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

var ProductFilter = new Filter({
  MinPrice:     Filters.Gte('price'),
  AddedBetween: DateBetweenFilter('added'),
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

The spec passed to the constructor is a series of key/values, where the key is the name for this part of the filter, and the value is a filter function which converts a value into a Mongo query. Instead of the value being a function, it can also be an Object containing a "filter" item. These are equivalent:

```javascript
var ProductFilter = new Filter({
  MinPrice: Filters.Gte('price')
});

var ProductFilter = new Filter({
  MinPrice: {
    filter: Filters.Gte('price')
  }
});
```

The first version is compact, but the second version allows us to store more things alongside the filter, such as arbitrary useful meta data. Here we store information about a "template" that we might want to use to let the user select what min-price to filter on:

```javascript
var ProductFilter = new Filter({
  MinPrice: {
    filter: Filters.Gte('price'),
    meta: {
      template: Template.minPriceFilterTemplate
    }
  }
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

var ProductFilter = new Filter({
  MinPrice: {
    filter: CustomFilter('price'),
    meta: {
      bar: 789,
    }
  }
});

ProductFilter.meta('MinPrice') ==
{
  foo: 123,
  bar: 789,
}
```

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

To clear all values:

```javascript
filter.clear();
```

To reset the object data to what it was when it was originally constructed:

```javascript
filter.reset();
```

You can also disable a filter value rather than removing it. Then if you re-enable it, it will contain the previous value that it had. Note, disabled values don't appear when calling "save" or "query".

```javascript
filter.disable('MinPrice');
filter.disable('Multiple', 'Values');
filter.disable(['Multiple', 'Values', 'In', 'An', 'Array']);
filter.enable('MinPrice');
filter.enable('Multiple', 'Values');
filter.enable(['Multiple', 'Values', 'In', 'An', 'Array']);
```

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

## Events

Filter classes use [EventEmitter](https://nodejs.org/api/events.html). Whenever a filter value is changed, a "change" event is emitted. This might be caused by a "set", "unset", "enable", "disable", "clear" or "reset", but will only be triggered when an operation causes the result of a "save" or "query" to be different.

```javascript
1. var filter = new ProductFilter({ MinPrice: 3 });
2. filter.on('change', function(){
     console.log("Mongo query is now", filter.query());
   });
3. filter.set({ MinPrice: 2 });
4. filter.set({ MinPrice: 2 });
5. filter.reset();
```

In the above example, the mongo query is logged to the console after lines 3 and 5. It is not logged at line 1, because it only happens when the filter has changed, not whilst it is being created (also the event handler hasn't been attached at this point). It is not logged at line 4 because the underlying data didn't change.

## Filter Factories

#### Filters.Eq

A direct "equals" comparison. [$eq](https://docs.mongodb.org/v3.0/reference/operator/query/eq/)

|               | Type                 | Description |
|---------------|----------------------|-------------|
| Factory  arg1 | `String`             | Field name  |
| Function arg1 | `String` or `Number` | Value       |

```javascript
var filter = Filters.Eq('price');
var result = filter(3);
result == {
  'price': 3
};
```

#### Filters.Gt

A "greater than" comparison.
[$gt](https://docs.mongodb.org/v3.0/reference/operator/query/gt/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = Filters.Gt('price');
var result = filter(3);
result == {
  'price': {
    $gt: 3
  }
};
```

#### Filters.Gte

A "greater than or equal to" comparison.
[$gte](https://docs.mongodb.org/v3.0/reference/operator/query/gte/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = Filters.Gte('price');
var result = filter(3);
result == {
  'price': {
    $gte: 3
  }
};
```

#### Filters.Lt

A "less than" comparison.
[$lt](https://docs.mongodb.org/v3.0/reference/operator/query/lt/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = Filters.Lt('price');
var result = filter(3);
result == {
  'price': {
    $lt: 3
  }
};
```

#### Filters.Lte

A "less than or equal to" comparison.
[$lte](https://docs.mongodb.org/v3.0/reference/operator/query/lte/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = Filters.Lte('price');
var result = filter(3);
result == {
  'price': {
    $lte: 3
  }
};
```

#### Filters.In

A "must be one of" comparison.
[$in](https://docs.mongodb.org/v3.0/reference/operator/query/in/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Array`  | Value       |

```javascript
var filter = Filters.In('price');
var result = filter([2, 3, 4]);
result == {
  'price': {
    $in: [2, 3, 4]
  }
};
```

#### Filters.Nin

A "must not be one of" comparison.
[$nin](https://docs.mongodb.org/v3.0/reference/operator/query/nin/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Array`  | Value       |

```javascript
var filter = Filters.Nin('price');
var result = filter([2, 3, 4]);
result == {
  'price': {
    $nin: [2, 3, 4]
  }
};
```

#### Filters.Or

A Boolean OR filter.
[$or](https://docs.mongodb.org/v3.0/reference/operator/query/or/)

|               | Type                | Description |
|---------------|---------------------|-------------|
| Factory  arg1 | `String`            | Field name  |
| Function arg1 | `Array` OR `Object` | Value       |

```javascript
var filter = Filters.Or([
  Filters.Eq('price')(0),
  Filters.Gt('price')(4)
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
var filter = Filters.Or({
  ExactPrice: Filters.Eq('price'),
  GtPrice:    Filters.Gt('price')
});
var result = filter({
  ExactPrice: 0,
  GtPrice:    4
});
```

You can create queries of arbitrary depth using this method:

```javascript
var filter = Filters.Or({
  price:  Filters.Or({
    exact: Filters.Eq('price'),
    above: Filters.Gt('price'),
  }),
  status: Filters.Eq('status'),
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
var filter = Filters.Or({
  price:  Filters.Or({
    exact: Filters.Eq('price'),
    above: Filters.Gt('price'),
  }),
  status: Filters.Eq('status')('active'),
});

var result = filter({
  price: {
    exact: 10,
    above: 20
  }
});
```

#### Filters.And

A Boolean AND filter.
[$and](https://docs.mongodb.org/v3.0/reference/operator/query/and/)

|               | Type                | Description |
|---------------|---------------------|-------------|
| Factory  arg1 | `String`            | Field name  |
| Function arg1 | `Array` OR `Object` | Value       |

See [Filters.Or](#orfilter). It works exactly the same except uses $and instead of $or

#### Filters.Not

A "must not be" comparison.
[$not](https://docs.mongodb.org/v3.0/reference/operator/query/not/)

|               | Type      | Description |
|---------------|-----------|-------------|
| Factory  arg1 | `String`  | Field name  |
| Function arg1 | anything  | Value       |

```javascript
var filter = Filters.Not(Filters.Eq('price'));
var result = filter(5);
result == {
  'price': {
    $not: {
      $eq: 5
    }
  }
};
```

The filter function provided by the Filters.Not factory function, passes the value supplied to its child.

The Mongo $not filter is strange in that it is incompatible with certain queries. The Filters.Not factory function tries to restructure things to make them work. For example, the following 3 are invalid:

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

#### Filters.Nor

A Boolean NOT OR filter.
[$nor](https://docs.mongodb.org/v3.0/reference/operator/query/nor/)

|               | Type                | Description |
|---------------|---------------------|-------------|
| Factory  arg1 | `String`            | Field name  |
| Function arg1 | `Array` OR `Object` | Value       |

See [Filters.Or](#orfilter). It works exactly the same except uses $nor instead of $or

#### Filters.Exists

A "exists" comparison.
[$exists](https://docs.mongodb.org/v3.0/reference/operator/query/exists/)

|               | Type      | Description                |
|---------------|-----------|----------------------------|
| Factory  arg1 | `String`  | Field name                 |
| Function arg1 | `Boolean` | Optional. Defaults to true |

```javascript
var filter = Filters.Exists('price');

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

#### Filters.Type

A "must be of this type" comparison.
[$type](https://docs.mongodb.org/v3.0/reference/operator/query/type/)

|              | Type     | Description      |
|--------------|----------|------------------|
| Factory arg1 | `String` | Field name       |
| Factory arg2 | `Number` | Field value type |

```javascript
var filter = Filters.Type('date', 9);
var result = filter();
result == {
  'date': {
    $type: 9
  }
};
```

#### Filters.Mod

A "given this divisor, must match this remainder" comparison.
[$mod](https://docs.mongodb.org/v3.0/reference/operator/query/mod/)

|               | Type     | Description                    |
|---------------|----------|--------------------------------|
| Factory  arg1 | `String` | Field name                     |
| Function arg1 | `Object` | Contains divisor and remainder |

```javascript
var filter = Filters.Mod('price');
var result = filter({ divisor: 2, remainder: 1 });
result == {
  'price': {
    $mod: [ 2, 1 ]
  }
};
```

The above would pick out all documents where the "price" value is an odd number (1, 3, 5 etc).

#### Filters.Regex

A "must match this regular expression" comparison.
[$regex](https://docs.mongodb.org/v3.0/reference/operator/query/regex/)

|              | Type                 | Description                    |
|--------------|----------------------|--------------------------------|
| Factory arg1 | `String`             | Field name                     |
| Factory arg2 | `String` or `RegExp` | Regular expression             |
| Factory arg3 | `String`             | Optional regex specifiers      |

```javascript
var filter = Filters.Regex('name', '^A', 'i'); // or:
var filter = Filters.Regex('name', /^A/, 'i'); // or:
var filter = Filters.Regex('name', /^A/i);

var result = filter();
result == {
  'name': {
    $regex: /^A/i
  }
};
```

#### Filters.Text

A "must match this text" comparison.
[$text](https://docs.mongodb.org/v3.0/reference/operator/query/text/)

|               | Type     | Description          |
|---------------|----------|----------------------|
| Factory  arg1 | `String` | Language (optional)  |
| Function arg1 | `String` | String to search for |

```javascript
var filter = Filters.Text('en');
var result = filter('Mike Cardwell');
result == {
  $text: {
    $search:   'Mike Cardwell',
    $language: 'en'
  }
};
```

Unlike the other filter factories we've looked at up until this point, we don't specify a field name. That is because Mongo searches any field with a text index in the collection.

#### Filters.Where

A "function run on document must return true" comparison.
[$where](https://docs.mongodb.org/v3.0/reference/operator/query/where/)

|               | Type                   | Description                  |
|---------------|------------------------|------------------------------|
| Factory  arg1 | `Function` or `String` | Function to run on documents |
| Function args | anything               | All args passed to function supplied in Factory arg1  |

```javascript
var filter = Filters.Where(function(field, min){
  return this[ field ] >= min;
});
var result = filter('price', 3);
result == {
  $where: function () {
    return this.price >= 3;
  }
};
```

#### Filters.All

A "all values must be contained in doc" comparison.
[$all](https://docs.mongodb.org/v3.0/reference/operator/query/all/)

|               | Type                   | Description |
|---------------|------------------------|-------------|
| Factory  arg1 | `String`               | Field name  |
| Function arg1 | `Array`                | Values      |

```javascript
var filter = Filters.All('names');
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

#### Filters.ElemMatch

A "at least one element query must match doc" comparison.
[$elemMatch](https://docs.mongodb.org/v3.0/reference/operator/query/elemMatch/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Object` | Queries     |

```javascript
var filter = Filters.ElemMatch('price');
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

#### Filters.Size

A "array must have this many items" comparison.
[$size](https://docs.mongodb.org/v3.0/reference/operator/query/size/)

|               | Type     | Description     |
|---------------|----------|-----------------|
| Factory  arg1 | `String` | Field name      |
| Function arg1 | `Number` | Number of items |

```javascript
var filter = Filters.Size('names');
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
