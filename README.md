![GitHub tag](https://img.shields.io/github/v/release/smallsaucepan/marching-squares-ts.svg)

![Build Status](https://img.shields.io/github/actions/workflow/status/smallsaucepan/marching-squares-ts/ci.yaml)

[![npm](https://img.shields.io/npm/dw/marching-squares-ts.svg)](https://www.npmjs.com/package/marching-squares-ts)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

# marching-squares-ts

A TypeScript implementation of the [Marching Squares](https://en.wikipedia.org/wiki/Marching_squares) algorithm featuring IsoLines and IsoBand computation.

This library is a fork of [MarchingSquares.js](https://github.com/RaumZeit/MarchingSquares.js) by Ronny Lorenz (@RaumZeit), converted to TypeScript and with some minor differences in behaviour. Published and maintained going forward by James Beard (@smallsaucepan).

The implementation computes _iso lines_ (_iso contours_) or _iso bands_ for rectangular 2-dimensional scalar fields and returns an array of (closed) paths that enclose the respective threshold(s). To speed-up computations when multiple _iso lines_/_iso bands_ are required, the implementation makes use of a [Quad-Tree](https://en.wikipedia.org/wiki/Quadtree) data structure for fast look-ups of those cells in the scalar field that actually contribute to the _iso line_ or _iso band_, respectively.

## Table of contents

1. [Availability](#availability)
1. [Installation](#installation)
1. [Usage](#usage)
1. [API](#api)
1. [Examples](#examples)
1. [License](#license)

## Availability

You can use this module as an [npm package](https://www.npmjs.com/package/marching-squares-ts), load it directly in the browser from a [CDN](), or view the source over on [github](https://github.com/smallsaucepan/marching-squares-ts).

The library should be usable in both CommonJS (require) and ESM (import) environments.

## Installation

#### Install from NPM

```shell

npm install marching-squares-ts

```

#### Load from a CDN

_Todo once first version published_

## Usage

Most users of this module will import and call either the `isoLines` or `isoBands` functions, passing some arguments and getting a return value.

There are some easy optimisations available, especially if you are calling `isoLines` or `isoBands` on the same source data multiple times. These are covered in more detail below.

The basics first - iso lines.

```javascript
import { isoLines } from  "marching-squares-ts");

const data = [
  [1, 1, 2],
  [1, 2, 3],
  [2, 3, 3],
];

const thresholds = [1, 2];

const lines = isoLines(data, thresholds);
```

This will yield the data of two lines, which if displayed graphically would look something like this:

Next - iso bands.

```javascript
import { isoBands } from  "marching-squares-ts");

const data = [
  [1, 1, 2],
  [1, 2, 3],
  [2, 3, 3],
];

const lowerBounds = [1, 2];
const bandWidths = [1, 1];

const lines = isoBands(data, lowerBounds, bandWidths);

```

This will yield the data of two bands, which might look like this if displayed visually:

### Optimisations

As part of processing the input data this module uses a Quad Tree to improve performance. This usually happens automatically. However, if you are calling `isoLines` or `isoBands` repeatedly on the same input data, it is possible to pre-generate the tree and pass it instead of the data.

Instead of

```javascript
import { isoBands } from  "marching-squares-ts");

...
const lines1 = isoLines(data, thresholds1);
const lines2 = isoLines(data, thresholds2);
```

do this

```javascript
import { isoBands, QuadTree } from  "marching-squares-ts");

...
const tree = new QuadTree(data); // extra step :(
const lines1 = isoLines(tree, thresholds1); // faster :)
const lines2 = isoLines(tree, thresholds2); // faster :)
```

---

## API

### Iso Lines

```javascript
function isoLines(data, thresholds, options)
```

Compute _iso lines_ for a 2-dimensional scalar field and a list of thresholds.

| Parameter    | Description                                                                                                                                                              |
| ------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`       | 2-dimensional input data, i.e. the scalar field (must be array of arrays, or pre-processed data object obtained from `new QuadTree()`). This parameter is **mandatory**. |
| `thresholds` | An array of numerical values defining the curve function for the _iso line(s)_. This parameter is **mandatory**                                                          |
| `options`    | An object with attributes allowing for changes in the behavior of this function (See below). This parameter is **optional**                                              |

#### Returns:

An array of arrays of paths representing the _iso lines_ for the given `thresholds` and input `data`. Each element of the top level array represents the results for a single value in `thresholds`. Three threshold values in, three arrays of paths out.

A single path is an array of coordinates where each coordinate, again, is an array with two entries `[ x, y ]` denoting the `x` and `y` position, respectively.

Note, that the paths resemble _linear Rings_ by default, i.e. they are closed and have identical first and last coordinates. (see the `options` parameter to change the output)

Furthermore, if all values at the border of the input data are below the threshold, a rectangular frame path with coordinates `[ 0, 0 ], [0, rows], [cols, rows], [cols, 0]`, i.e. enclosing the entire scalar field, will be added as first element of the returned array. Here, the values of `rows` and `cols` are the number of rows and columns of the input data, respectively. To disable this behaviour, the user may pass the `options.noFrame=true`.

### Iso Bands

```javascript
function isoBands(data, thresholds, bandwidths, options)
```

Compute _iso bands_ for a 2-dimensional scalar field, a (list of) lowerBound(s), and a (list of) bandWidth(s).

| Parameter    | Description                                                                                                                                                              |
| ------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`       | 2-dimensional input data, i.e. the scalar field (must be array of arrays, or pre-processed data object obtained from `new QuadTree()`). This parameter is **mandatory**. |
| `thresholds` | An array of numerical values that define the lower bounds of the _iso bands_. This parameter is **mandatory**.                                                           |
| `bandwidths` | An array of numerical values that define the widths of the _iso bands_. This parameter is **mandatory**.                                                                 |
| `options`    | An object with attributes allowing for changes in the behavior of this function (See below). This parameter is **optional**.                                             |

#### Returns:

An array of arrays of paths representing the _iso lines_ which enclose the _iso bands_ of size `bandWidths`. Each element of the top level array represents the results for a single value in `bandwidths`. Three bandwidth values in, three arrays of paths out.

A single path is an array of coordinates where each coordinate, again, is an array with two entries `[ x, y ]` denoting the `x` and `y` position, respectively.

Note, that the paths resemble _linear Rings_ by default, i.e. they are closed and have identical first and last coordinates. (see the `options` parameter to change the output)

### Options

The following options can be passed to either `isoLines` or `isoBands` as properties on an options object.

```javascript
const lines = isoLines(data, thresholds, { verbose: true, noFrame: true });
```

| Property          | Type       | Description                                                                                                                                                                                                                                                                                                  | Default value |
| ----------------- | :--------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `successCallback` | _function_ | A function called at the end of each _iso line_ / _iso band_ computation. It will be passed the `path array` and the corresponding limit(s) (`threshold` or `lowerBound, bandWidth`) as first and second (third) arguments, respectively.                                                                    | `null`        |
| `verbose`         | _bool_     | Create `console.log()` info messages before each major step of the algorithm                                                                                                                                                                                                                                 | `false`       |
| `polygons`        | _bool_     | If `true` the function returns a list of path coordinates for individual polygons within each grid cell, if `false` returns a list of path coordinates representing the outline of connected polygons.                                                                                                       | `false`       |
| `linearRing`      | _bool_     | If `true`, the polygon paths are returned as linear rings, i.e. the first and last coordinate are identical indicating a closed path. Note, that for the `IsoLines` implementation a value of `false` reduces the output to _iso lines_ that are not necessarily closed paths.                               | `true`        |
| `noQuadTree`      | _bool_     | If `true`, Quad-Tree optimization is deactivated no matter what the input is. Otherwise, the implementations make use of Quad-Tree optimization if the input demands for _multiple_ iso lines/bands.                                                                                                         | `false`       |
| `noFrame`         | _bool_     | If `true`, the _iso line_ / _iso contour_ algorithm omits the enclosing rectangular outer frame when all data points along the boundary of the scalar field are below the threshold. Otherwise, if necessary, the enclosing frame will be included for each threshold level as the very first returned path. | `false`       |

## Examples

The _iso band_ shown below will contain all values greater than or equal to 2 and _less than_ 3.

```javascript
const thresholds = [2];

const bandwidths = [1];

const data = [
  [18, 13, 10, 9, 10, 13, 18],
  [13, 8, 5, 4, 5, 8, 13],
  [10, 5, 2, 1, 2, 5, 10],
  [10, 5, 2, 1, 2, 5, 10],
  [13, 8, 5, 4, 5, 8, 13],
  [18, 13, 10, 9, 10, 13, 18],
  [18, 13, 10, 9, 10, 13, 18],
];

const bands = isoBands(data, thresholds, bandwidths);
```

The return value, `bands`, is an array of arrays of closed polygons which includes all the points of the grid meeting the criteria.

You can find more examples in the [example/](example/) directory.

---

## License

marching-squares-ts is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

marching-squares-ts grants additional permissions under GNU Affero General Public License version 3 section 7. See [LICENSE.md](LICENSE.md) for details.

---

Portions Copyright (c) 2015-2018 Ronny Lorenz <ronny@tbi.univie.ac.at>

Portions Copyright (c) 2024 James Beard <james@smallsaucepan.com>
