import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import test from "tape";
import { loadJsonFileSync } from "load-json-file";
import { isoBands } from "../src/isobands.js";
import { isoLines } from "../src/isolines.js";
import { QuadTree } from "../src/quadtree.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var directories = {
  in: path.join(__dirname, "data", "in") + path.sep,
  out: path.join(__dirname, "data", "out") + path.sep,
};

var isoBandsTestCases = fs
  .readdirSync(directories.in)
  .filter(function (filename) {
    return filename.includes("isoBands");
  })
  .map(function (filename) {
    return {
      name: path.parse(filename).name,
      data: loadJsonFileSync(directories.in + filename),
    };
  });

test("isoBands output", function (t) {
  isoBandsTestCases.forEach(function (inputFile) {
    var name = inputFile.name;
    var data = inputFile.data.matrix;
    var outputfile = directories.out + name + ".json";
    var thresholds = inputFile.data.thresholds;
    var bandwidths = inputFile.data.bandwidths;

    var bands = isoBands(data, thresholds, bandwidths);
    // console.log(JSON.stringify(bands));
    t.deepEqual(bands, loadJsonFileSync(outputfile), name);
  });

  t.end();
});

var isoLinesTestCases = fs
  .readdirSync(directories.in)
  .filter(function (filename) {
    return filename.includes("isoLines");
  })
  .map(function (filename) {
    return {
      name: path.parse(filename).name,
      data: loadJsonFileSync(directories.in + filename),
    };
  });

test("isoLines output", function (t) {
  isoLinesTestCases.forEach(function (inputFile) {
    var name = inputFile.name;
    var data = inputFile.data.matrix;
    var outputfile = directories.out + name + ".json";
    var thresholds = inputFile.data.thresholds;

    var lines = isoLines(data, thresholds);
    // console.log(JSON.stringify(lines));
    t.deepEqual(lines, loadJsonFileSync(outputfile), name);
  });

  t.end();
});

test("isoBands input validation", function (t) {
  const dataArr = [[1], [2], [3]];

  t.throws(
    function () {
      isoBands(null, [0], [5]);
    },
    /data is required/,
    "missing data"
  );
  t.throws(
    function () {
      isoBands("string", [0], [5]);
    },
    /array of arrays/,
    "invalid type for data"
  );
  t.throws(
    function () {
      isoBands([1], [0], [5]);
    },
    /array of arrays/,
    "only one dimension to data"
  );
  t.throws(
    function () {
      isoBands(dataArr, null, [5]);
    },
    /thresholds is required/,
    "missing thresholds"
  );
  t.throws(
    function () {
      isoBands(dataArr, "number", [3]);
    },
    /thresholds must be an array/,
    "invalid type for thresholds"
  );
  t.throws(
    function () {
      isoBands(dataArr, [0, "foo"], [1, 2]);
    },
    /is not a number/,
    "invalid type for thresholds entry"
  );
  t.throws(
    function () {
      isoBands(dataArr, [0], null);
    },
    /bandwidths is required/,
    "missing bandwidths"
  );
  t.throws(
    function () {
      isoBands(dataArr, [23], "string");
    },
    /bandwidths must be an array/,
    "invalid type for bandwidths"
  );
  t.throws(
    function () {
      isoBands(dataArr, [0, 1], [1, "foo"]);
    },
    /is not a number/,
    "invalid type for bandwidths entry"
  );
  t.throws(
    function () {
      isoBands(dataArr, [0], [1, 5]);
    },
    /threshold and bandwidth arrays have unequal lengths/,
    "unequal thresholds + bandwidths array lengths"
  );
  t.throws(
    function () {
      isoBands(dataArr, [2], [1], "string");
    },
    /options must be an object/,
    "invalid type for options"
  );
  t.end();
});

test("isoLines input validation", function (t) {
  var dataArr = [[1], [2], [3]];

  t.throws(
    function () {
      isoLines(null, [0]);
    },
    /data is required/,
    "missing data"
  );
  t.throws(
    function () {
      isoLines("string", 0);
    },
    /array of arrays/,
    "invalid type for data"
  );
  t.throws(
    function () {
      isoLines([1], 0);
    },
    /array of arrays/,
    "only one dimension to data"
  );
  t.throws(
    function () {
      isoLines(dataArr, null);
    },
    /thresholds is required/,
    "missing thresholds"
  );
  t.throws(
    function () {
      isoLines(dataArr, "number");
    },
    /thresholds must be an array/,
    "invalid type for thresholds"
  );
  t.throws(
    function () {
      isoLines(dataArr, [0, "foo"]);
    },
    /is not a number/,
    "invalid type for threshold entry"
  );
  t.throws(
    function () {
      isoLines(dataArr, [23], "string");
    },
    /options must be an object/,
    "invalid type for options"
  );

  t.end();
});

test("successCallback check", function (t) {
  var data = [
    [1, 1],
    [1, 5],
  ];
  var called = false;
  var options = {
    successCallback: function () {
      called = true;
    },
  };

  isoLines(data, [1], options);
  t.true(called);
  called = false;
  isoBands(data, [1], [2], options);
  t.true(called);

  t.end();
});

test("QuadTree", function (t) {
  var data = [
    [1, 1, 1, 0],
    [1, 5, 5, 1],
    [0, 5, 7, 1],
  ];
  var prepData = new QuadTree(data);

  t.equal("QuadTree", prepData.constructor.name);
  t.equal("TreeNode", prepData.root.constructor.name);

  t.throws(
    function () {
      new QuadTree(null);
    },
    /data is required/,
    "missing data"
  );
  t.throws(
    function () {
      new QuadTree([]);
    },
    /array of arrays/,
    "1D array"
  );
  t.throws(
    function () {
      new QuadTree([[]]);
    },
    /two rows/,
    "Empty 2D array"
  );
  t.throws(
    function () {
      new QuadTree([[0]]);
    },
    /two rows/,
    "Single row"
  );
  t.throws(
    function () {
      new QuadTree([[0], [0]]);
    },
    /two columns/,
    "Single column"
  );
  t.throws(
    function () {
      new QuadTree([[0, 1], [0]]);
    },
    /unequal row lengths/,
    "Unequal row lengths"
  );

  /* There are only only two cells with threshold 0 */
  t.deepEqual(
    [
      { x: 2, y: 0 },
      { x: 0, y: 1 },
    ],
    prepData.root.cellsBelowThreshold(0, false)
  );
  /* There are only two cells with threshold 7 */
  t.deepEqual(
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    prepData.root.cellsBelowThreshold(7, false)
  );
  /* there is no cell with threshold -2 */
  t.deepEqual([], prepData.root.cellsBelowThreshold(-2, false));
  /* there is no cell with threshold -2 */
  t.deepEqual([], prepData.root.cellsBelowThreshold(10, false));
  /* only two cells with band [7:8] */
  t.deepEqual(
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    prepData.root.cellsInBand(7, 8, false)
  );

  t.end();
});
