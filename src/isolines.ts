import {
  isoLineOptions,
  type Options,
  type IsoLineOptions,
} from "./options.js";
import { cell2Polygons, traceLinePaths } from "./polygons.js";
import { QuadTree, type TreeNode } from "./quadtree.js";
import { type Ring, type LineCell, type LineCellGrid } from "./common.js";

/*
 * Compute the iso lines for a scalar 2D field given
 * a certain threshold by applying the Marching Squares
 * Algorithm. The function returns a list of path coordinates
 */

function isoLines(
  input: number[][] | QuadTree,
  thresholds: number[],
  options?: Options
) {
  let settings: IsoLineOptions,
    i: number,
    j: number,
    useQuadTree = false,
    tree: QuadTree | null = null,
    root: TreeNode | null = null,
    data: number[][],
    cellGrid: LineCellGrid = [],
    linePolygons: Ring[],
    ret: Ring[][] = [];

  /* Defaults for optional args */
  options = options ?? {};

  /* validation */
  if (!!options && typeof options !== "object")
    throw new Error("options must be an object");

  /* process options */
  settings = isoLineOptions(options);

  /* check for input data */
  if (!input) throw new Error("data is required");
  if (input instanceof QuadTree) {
    tree = input;
    root = input.root;
    data = input.data;
    if (!settings.noQuadTree) useQuadTree = true;
  } else if (Array.isArray(input) && Array.isArray(input[0])) {
    data = input;
  } else {
    throw new Error(
      "input is neither array of arrays nor object retrieved from 'QuadTree()'"
    );
  }

  if (thresholds === undefined || thresholds === null)
    throw new Error("thresholds is required");
  if (!Array.isArray(thresholds))
    throw new Error("thresholds must be an array");

  /* check and prepare input thresholds */

  /* activate QuadTree optimization if not explicitly forbidden by user settings */
  if (!settings.noQuadTree) useQuadTree = true;

  /* check if all thresholds are numbers */
  for (i = 0; i < thresholds.length; i++)
    if (isNaN(+thresholds[i]))
      throw new Error("thresholds[" + i + "] is not a number");

  /* create QuadTree root node if not already present */
  if (useQuadTree && !root) {
    tree = new QuadTree(data);
    root = tree.root;
    data = tree.data;
  }

  if (settings.verbose) {
    if (settings.polygons)
      console.log(
        "isoLines: returning single lines (polygons) for each grid cell"
      );
    else
      console.log(
        "isoLines: returning line paths (polygons) for entire data grid"
      );
  }

  /* Done with all input validation, now let's start computing stuff */

  /* loop over all threhsold values */
  thresholds.forEach(function (t, i) {
    linePolygons = [];

    /* store bounds for current computation in settings object */
    settings.threshold = t;

    if (settings.verbose)
      console.log(
        "MarchingSquaresJS-isoLines: computing iso lines for threshold " + t
      );

    if (settings.polygons) {
      /* compose list of polygons for each single cell */
      if (useQuadTree) {
        /* go through list of cells retrieved from QuadTree */
        root!
          .cellsBelowThreshold(settings.threshold, true)
          .forEach(function (c) {
            const cell = prepareCell(data, c.x, c.y, settings);
            if (cell) {
              linePolygons = linePolygons.concat(
                cell2Polygons(cell, c.x, c.y, settings)
              );
            }
          });
      } else {
        /* go through entire array of input data */
        for (j = 0; j < data.length - 1; ++j) {
          for (i = 0; i < data[0].length - 1; ++i) {
            const cell = prepareCell(data, i, j, settings);
            if (cell) {
              linePolygons = linePolygons.concat(
                cell2Polygons(cell, i, j, settings)
              );
            }
          }
        }
      }
    } else {
      /* sparse grid of input data cells */
      cellGrid = [];
      for (i = 0; i < data[0].length - 1; ++i) cellGrid[i] = [];

      /* compose list of polygons for entire input grid */
      if (useQuadTree) {
        /* collect the cells */
        root!
          .cellsBelowThreshold(settings.threshold, false)
          .forEach(function (c) {
            cellGrid[c.x][c.y] = prepareCell(data, c.x, c.y, settings);
          });
      } else {
        /* prepare cells */
        for (i = 0; i < data[0].length - 1; ++i) {
          for (j = 0; j < data.length - 1; ++j) {
            cellGrid[i][j] = prepareCell(data, i, j, settings);
          }
        }
      }

      linePolygons = traceLinePaths(data, cellGrid, settings);
    }

    /* finally, add polygons to output array */
    ret.push(linePolygons);

    if (typeof settings.successCallback === "function") {
      settings.successCallback(ret, t);
    }
  });

  return ret;
}

/*
 * Thats all for the public interface, below follows the actual
 * implementation
 */

/*
 * ################################
 * Isocontour implementation below
 * ################################
 */

function prepareCell(
  grid: number[][],
  x: number,
  y: number,
  settings: IsoLineOptions
): LineCell | undefined {
  let cval = 0;
  const x3 = grid[y + 1][x],
    x2 = grid[y + 1][x + 1],
    x1 = grid[y][x + 1],
    x0 = grid[y][x],
    threshold = settings.threshold!; // assume threshold defined

  /*
   * Note that missing data within the grid will result
   * in horribly failing to trace full polygon paths
   */
  if (isNaN(x0) || isNaN(x1) || isNaN(x2) || isNaN(x3)) {
    return;
  }

  /*
   * Here we detect the type of the cell
   *
   * x3 ---- x2
   * |      |
   * |      |
   * x0 ---- x1
   *
   * with edge points
   *
   * x0 = (x,y),
   * x1 = (x + 1, y),
   * x2 = (x + 1, y + 1), and
   * x3 = (x, y + 1)
   *
   * and compute the polygon intersections with the edges
   * of the cell. Each edge value may be (i) smaller, or (ii)
   * greater or equal to the iso line threshold. We encode
   * this property using 1 bit of information, where
   *
   * 0 ... below,
   * 1 ... above or equal
   *
   * Then we store the cells value as vector
   *
   * cval = (x0, x1, x2, x3)
   *
   * where x0 is the least significant bit (0th),
   * x1 the 2nd bit, and so on. This essentially
   * enables us to work with a single integer number
   */

  cval |= x3 >= threshold ? 8 : 0;
  cval |= x2 >= threshold ? 4 : 0;
  cval |= x1 >= threshold ? 2 : 0;
  cval |= x0 >= threshold ? 1 : 0;

  /* make sure cval is a number */
  cval = +cval;

  /* compose the cell object */
  const cell: LineCell = {
    cval: cval,
    polygons: [],
    edges: {},
    x0: x0,
    x1: x1,
    x2: x2,
    x3: x3,
  };

  /*
   * Compute interpolated intersections of the polygon(s)
   * with the cell borders and (i) add edges for polygon
   * trace-back, or (ii) a list of small closed polygons
   */
  let left, right, top, bottom, average;

  switch (cval) {
    case 0:
      if (settings.polygons)
        cell.polygons.push([
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
        ]);

      break;

    case 15:
      /* cell is outside (above) threshold, no polygons */
      break;

    case 14 /* 1110 */:
      left = settings.interpolate(x0, x3, threshold);
      bottom = settings.interpolate(x0, x1, threshold);

      if (settings.polygons_full) {
        cell.edges.left = {
          path: [
            [0, left],
            [bottom, 0],
          ],
          move: {
            x: 0,
            y: -1,
            enter: "top",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [0, 0],
          [0, left],
          [bottom, 0],
        ]);

      break;

    case 13 /* 1101 */:
      bottom = settings.interpolate(x0, x1, threshold);
      right = settings.interpolate(x1, x2, threshold);

      if (settings.polygons_full) {
        cell.edges.bottom = {
          path: [
            [bottom, 0],
            [1, right],
          ],
          move: {
            x: 1,
            y: 0,
            enter: "left",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [bottom, 0],
          [1, right],
          [1, 0],
        ]);

      break;

    case 11 /* 1011 */:
      right = settings.interpolate(x1, x2, threshold);
      top = settings.interpolate(x3, x2, threshold);

      if (settings.polygons_full) {
        cell.edges.right = {
          path: [
            [1, right],
            [top, 1],
          ],
          move: {
            x: 0,
            y: 1,
            enter: "bottom",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [1, right],
          [top, 1],
          [1, 1],
        ]);

      break;

    case 7 /* 0111 */:
      left = settings.interpolate(x0, x3, threshold);
      top = settings.interpolate(x3, x2, threshold);

      if (settings.polygons_full) {
        cell.edges.top = {
          path: [
            [top, 1],
            [0, left],
          ],
          move: {
            x: -1,
            y: 0,
            enter: "right",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [top, 1],
          [0, left],
          [0, 1],
        ]);

      break;

    case 1 /* 0001 */:
      left = settings.interpolate(x0, x3, threshold);
      bottom = settings.interpolate(x0, x1, threshold);

      if (settings.polygons_full) {
        cell.edges.bottom = {
          path: [
            [bottom, 0],
            [0, left],
          ],
          move: {
            x: -1,
            y: 0,
            enter: "right",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [bottom, 0],
          [0, left],
          [0, 1],
          [1, 1],
          [1, 0],
        ]);

      break;

    case 2 /* 0010 */:
      bottom = settings.interpolate(x0, x1, threshold);
      right = settings.interpolate(x1, x2, threshold);

      if (settings.polygons_full) {
        cell.edges.right = {
          path: [
            [1, right],
            [bottom, 0],
          ],
          move: {
            x: 0,
            y: -1,
            enter: "top",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [0, 0],
          [0, 1],
          [1, 1],
          [1, right],
          [bottom, 0],
        ]);

      break;

    case 4 /* 0100 */:
      right = settings.interpolate(x1, x2, threshold);
      top = settings.interpolate(x3, x2, threshold);

      if (settings.polygons_full) {
        cell.edges.top = {
          path: [
            [top, 1],
            [1, right],
          ],
          move: {
            x: 1,
            y: 0,
            enter: "left",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [0, 0],
          [0, 1],
          [top, 1],
          [1, right],
          [1, 0],
        ]);

      break;

    case 8 /* 1000 */:
      left = settings.interpolate(x0, x3, threshold);
      top = settings.interpolate(x3, x2, threshold);

      if (settings.polygons_full) {
        cell.edges.left = {
          path: [
            [0, left],
            [top, 1],
          ],
          move: {
            x: 0,
            y: 1,
            enter: "bottom",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [0, 0],
          [0, left],
          [top, 1],
          [1, 1],
          [1, 0],
        ]);

      break;

    case 12 /* 1100 */:
      left = settings.interpolate(x0, x3, threshold);
      right = settings.interpolate(x1, x2, threshold);

      if (settings.polygons_full) {
        cell.edges.left = {
          path: [
            [0, left],
            [1, right],
          ],
          move: {
            x: 1,
            y: 0,
            enter: "left",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [0, 0],
          [0, left],
          [1, right],
          [1, 0],
        ]);

      break;

    case 9 /* 1001 */:
      bottom = settings.interpolate(x0, x1, threshold);
      top = settings.interpolate(x3, x2, threshold);

      if (settings.polygons_full) {
        cell.edges.bottom = {
          path: [
            [bottom, 0],
            [top, 1],
          ],
          move: {
            x: 0,
            y: 1,
            enter: "bottom",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [bottom, 0],
          [top, 1],
          [1, 1],
          [1, 0],
        ]);

      break;

    case 3 /* 0011 */:
      left = settings.interpolate(x0, x3, threshold);
      right = settings.interpolate(x1, x2, threshold);

      if (settings.polygons_full) {
        cell.edges.right = {
          path: [
            [1, right],
            [0, left],
          ],
          move: {
            x: -1,
            y: 0,
            enter: "right",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [0, left],
          [0, 1],
          [1, 1],
          [1, right],
        ]);

      break;

    case 6 /* 0110 */:
      bottom = settings.interpolate(x0, x1, threshold);
      top = settings.interpolate(x3, x2, threshold);

      if (settings.polygons_full) {
        cell.edges.top = {
          path: [
            [top, 1],
            [bottom, 0],
          ],
          move: {
            x: 0,
            y: -1,
            enter: "top",
          },
        };
      }

      if (settings.polygons)
        cell.polygons.push([
          [0, 0],
          [0, 1],
          [top, 1],
          [bottom, 0],
        ]);

      break;

    case 10 /* 1010 */:
      left = settings.interpolate(x0, x3, threshold);
      right = settings.interpolate(x1, x2, threshold);
      bottom = settings.interpolate(x0, x1, threshold);
      top = settings.interpolate(x3, x2, threshold);
      average = (x0 + x1 + x2 + x3) / 4;

      if (settings.polygons_full) {
        if (average < threshold) {
          cell.edges.left = {
            path: [
              [0, left],
              [top, 1],
            ],
            move: {
              x: 0,
              y: 1,
              enter: "bottom",
            },
          };
          cell.edges.right = {
            path: [
              [1, right],
              [bottom, 0],
            ],
            move: {
              x: 0,
              y: -1,
              enter: "top",
            },
          };
        } else {
          cell.edges.right = {
            path: [
              [1, right],
              [top, 1],
            ],
            move: {
              x: 0,
              y: 1,
              enter: "bottom",
            },
          };
          cell.edges.left = {
            path: [
              [0, left],
              [bottom, 0],
            ],
            move: {
              x: 0,
              y: -1,
              enter: "top",
            },
          };
        }
      }

      if (settings.polygons) {
        if (average < threshold) {
          cell.polygons.push([
            [0, 0],
            [0, left],
            [top, 1],
            [1, 1],
            [1, right],
            [bottom, 0],
          ]);
        } else {
          cell.polygons.push([
            [0, 0],
            [0, left],
            [bottom, 0],
          ]);
          cell.polygons.push([
            [top, 1],
            [1, 1],
            [1, right],
          ]);
        }
      }

      break;

    case 5 /* 0101 */:
      left = settings.interpolate(x0, x3, threshold);
      right = settings.interpolate(x1, x2, threshold);
      bottom = settings.interpolate(x0, x1, threshold);
      top = settings.interpolate(x3, x2, threshold);
      average = (x0 + x1 + x2 + x3) / 4;

      if (settings.polygons_full) {
        if (average < threshold) {
          cell.edges.bottom = {
            path: [
              [bottom, 0],
              [0, left],
            ],
            move: {
              x: -1,
              y: 0,
              enter: "right",
            },
          };
          cell.edges.top = {
            path: [
              [top, 1],
              [1, right],
            ],
            move: {
              x: 1,
              y: 0,
              enter: "left",
            },
          };
        } else {
          cell.edges.top = {
            path: [
              [top, 1],
              [0, left],
            ],
            move: {
              x: -1,
              y: 0,
              enter: "right",
            },
          };
          cell.edges.bottom = {
            path: [
              [bottom, 0],
              [1, right],
            ],
            move: {
              x: 1,
              y: 0,
              enter: "left",
            },
          };
        }
      }

      if (settings.polygons) {
        if (average < threshold) {
          cell.polygons.push([
            [0, left],
            [0, 1],
            [top, 1],
            [1, right],
            [1, 0],
            [bottom, 0],
          ]);
        } else {
          cell.polygons.push([
            [0, left],
            [0, 1],
            [top, 1],
          ]);
          cell.polygons.push([
            [bottom, 0],
            [1, right],
            [1, 0],
          ]);
        }
      }

      break;
  }

  return cell;
}

export { isoLines, isoLines as isoContours };
