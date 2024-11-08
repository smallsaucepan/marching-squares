import {
  type InternalOptions,
  type IsoBandOptions,
  type IsoLineOptions,
} from "./options.js";
import {
  type Coord,
  type Path,
  type Ring,
  type LineEntry,
  type LineCell,
  type LineCellGrid,
  type BandEntry,
  type BandCell,
  type BandCellGrid,
} from "./common.js";

function cell2Polygons(
  cell: LineCell | BandCell,
  x: number,
  y: number,
  settings: InternalOptions
) {
  const polygons: Ring[] = [];

  cell.polygons.forEach(function (p) {
    p.forEach(function (pp) {
      pp[0] += x;
      pp[1] += y;
    });

    if (settings.linearRing) p.push(p[0]);

    polygons.push(p);
  });

  return polygons;
}

function entry_coordinate(
  x: number,
  y: number,
  mode: 0 | 1 | 2 | 3,
  path: Path
): Coord {
  if (mode === 0) {
    /* down */
    x += 1;
    y += path[0][1];
  } else if (mode === 1) {
    /* left */
    x += path[0][0];
  } else if (mode === 2) {
    /* up */
    y += path[0][1];
  } else if (mode === 3) {
    /* right */
    x += path[0][0];
    y += 1;
  }

  return [x, y];
}

function skip_coordinate(x: number, y: number, mode: 0 | 1 | 2 | 3): Coord {
  if (mode === 0) {
    /* down */
    x++;
  } else if (mode === 1) {
    /* left */
    /* do nothing */
  } else if (mode === 2) {
    /* up */
    y++;
  } else if (mode === 3) {
    /* right */
    x++;
    y++;
  }

  return [x, y];
}

function requireFrame(
  data: number[][],
  lowerBound: number,
  upperBound: number
) {
  let frameRequired = true;
  const cols = data[0].length;
  const rows = data.length;

  for (let j = 0; j < rows; j++) {
    if (
      data[j][0] < lowerBound ||
      data[j][0] > upperBound ||
      data[j][cols - 1] < lowerBound ||
      data[j][cols - 1] > upperBound
    ) {
      frameRequired = false;
      break;
    }
  }

  if (
    frameRequired &&
    (data[rows - 1][0] < lowerBound ||
      data[rows - 1][0] > upperBound ||
      data[rows - 1][cols - 1] < lowerBound ||
      data[rows - 1][cols - 1] > upperBound)
  ) {
    frameRequired = false;
  }

  if (frameRequired)
    for (let i = 0; i < cols - 1; i++) {
      if (
        data[0][i] < lowerBound ||
        data[0][i] > upperBound ||
        data[rows - 1][i] < lowerBound ||
        data[rows - 1][i] > upperBound
      ) {
        frameRequired = false;
        break;
      }
    }

  return frameRequired;
}

function requireLineFrame(data: number[][], threshold: number) {
  let frameRequired = true;
  const cols = data[0].length;
  const rows = data.length;

  for (let j = 0; j < rows; j++) {
    if (data[j][0] >= threshold || data[j][cols - 1] >= threshold) {
      frameRequired = false;
      break;
    }
  }

  if (
    frameRequired &&
    (data[rows - 1][0] >= threshold || data[rows - 1][cols - 1] >= threshold)
  ) {
    frameRequired = false;
  }

  if (frameRequired)
    for (let i = 0; i < cols - 1; i++) {
      if (data[0][i] >= threshold || data[rows - 1][i] > threshold) {
        frameRequired = false;
        break;
      }
    }

  return frameRequired;
}

function traceBandPaths(
  data: number[][],
  cellGrid: BandCellGrid,
  settings: IsoBandOptions
) {
  const polygons: Ring[] = [];
  const rows = data.length - 1;
  const cols = data[0].length - 1;

  /*
   * directions for out-of-grid moves are:
   * 0 ... "down",
   * 1 ... "left",
   * 2 ... "up",
   * 3 ... "right"
   */
  const valid_entries: BandEntry[][] = [
    ["rt", "rb"] /* down */,
    ["br", "bl"] /* left */,
    ["lb", "lt"] /* up */,
    ["tl", "tr"] /* right */,
  ];
  const add_x = [0, -1, 0, 1];
  const add_y = [-1, 0, 1, 0];
  const available_starts: BandEntry[] = [
    "bl",
    "lb",
    "lt",
    "tl",
    "tr",
    "rt",
    "rb",
    "br",
  ];
  const entry_dir: { [K in BandEntry]: number } = {
    bl: 1,
    br: 1,
    lb: 2,
    lt: 2,
    tl: 3,
    tr: 3,
    rt: 0,
    rb: 0,
  };

  // assume minV and maxV are defined
  if (requireFrame(data, settings.minV!, settings.maxV!)) {
    if (settings.linearRing)
      polygons.push([
        [0, 0],
        [0, rows],
        [cols, rows],
        [cols, 0],
        [0, 0],
      ]);
    else
      polygons.push([
        [0, 0],
        [0, rows],
        [cols, rows],
        [cols, 0],
      ]);
  }

  /* finally, start tracing back first polygon(s) */
  cellGrid.forEach(function (a, i) {
    a.forEach(function (cell, j) {
      /* trace paths for all available edges that go through this cell */
      for (let e = 0; e < 8; e++) {
        const nextedge = available_starts[e];

        if (typeof cell?.edges[nextedge] !== "object") continue;

        /* start a new, full path */
        let ee = cell.edges[nextedge]!, // assume edge is defined
          enter = nextedge,
          x = i,
          y = j,
          finalized = false;

        const path: Path = [],
          origin: Coord = [i + ee.path[0][0], j + ee.path[0][1]];

        /* add start coordinate */
        path.push(origin);

        /* start traceback */
        while (!finalized) {
          let cc = cellGrid[x][y];

          if (typeof cc?.edges[enter] !== "object") break;

          ee = cc.edges[enter]!; // assume edge is defined

          /* remove edge from cell */
          delete cc.edges[enter];

          /* add last point of edge to path arra, since we extend a polygon */
          const point = ee.path[1];
          point[0] += x;
          point[1] += y;
          path.push(point);

          enter = ee.move.enter;
          x = x + ee.move.x;
          y = y + ee.move.y;

          /* handle out-of-grid moves */
          if (
            typeof cellGrid[x] === "undefined" ||
            typeof cellGrid[x][y] === "undefined"
          ) {
            let dir: 0 | 1 | 2 | 3 = 0,
              count = 0;

            if (x === cols) {
              x--;
              dir = 0; /* move downwards */
            } else if (x < 0) {
              x++;
              dir = 2; /* move upwards */
            } else if (y === rows) {
              y--;
              dir = 3; /* move right */
            } else if (y < 0) {
              y++;
              dir = 1; /* move left */
            } else {
              throw new Error("Left the grid somewhere in the interior!");
            }

            if (x === i && y === j && dir === entry_dir[nextedge]) {
              finalized = true;
              enter = nextedge;
              break;
            }

            while (true) {
              let found_entry = false;

              if (count > 4)
                throw new Error(
                  "Direction change counter overflow! This should never happen!"
                );

              if (
                !(
                  typeof cellGrid[x] === "undefined" ||
                  typeof cellGrid[x][y] === "undefined"
                )
              ) {
                cc = cellGrid[x][y];

                /* check for re-entry */
                for (let s = 0; s < valid_entries[dir].length; s++) {
                  const ve = valid_entries[dir][s];
                  if (typeof cc?.edges[ve] === "object") {
                    /* found re-entry */
                    ee = cc.edges[ve]!; // assume edge is defined
                    path.push(entry_coordinate(x, y, dir, ee.path));
                    enter = ve;
                    found_entry = true;
                    break;
                  }
                }
              }

              if (found_entry) {
                break;
              } else {
                path.push(skip_coordinate(x, y, dir));

                x += add_x[dir];
                y += add_y[dir];

                /* change direction if we'e moved out of grid again */
                if (
                  typeof cellGrid[x] === "undefined" ||
                  typeof cellGrid[x][y] === "undefined"
                ) {
                  if (
                    (dir === 0 && y < 0) ||
                    (dir === 1 && x < 0) ||
                    (dir === 2 && y === rows) ||
                    (dir === 3 && x === cols)
                  ) {
                    x -= add_x[dir];
                    y -= add_y[dir];

                    dir = (dir + 1) % 4;
                    count++;
                  }
                }

                if (x === i && y === j && dir === entry_dir[nextedge]) {
                  /* we are back where we started off, so finalize the polygon */
                  finalized = true;
                  enter = nextedge;
                  break;
                }
              }
            }
          }
        }

        if (
          settings.linearRing &&
          (path[path.length - 1][0] !== origin[0] ||
            path[path.length - 1][1] !== origin[1])
        )
          path.push(origin);

        polygons.push(path);
      } /* end forall entry sites */
    }); /* end foreach i */
  }); /* end foreach j */

  return polygons;
}

function traceLinePaths(
  data: number[][],
  cellGrid: LineCellGrid,
  settings: IsoLineOptions
) {
  const polygons: Ring[] = [];
  const rows = data.length - 1;
  const cols = data[0].length - 1;

  /*
   * directions for out-of-grid moves are:
   * 0 ... "down",
   * 1 ... "left",
   * 2 ... "up",
   * 3 ... "right"
   */
  const valid_entries: LineEntry[] = [
    "right" /* down */,
    "bottom" /* left */,
    "left" /* up */,
    "top" /* right */,
  ];
  const add_x = [0, -1, 0, 1];
  const add_y = [-1, 0, 1, 0];
  const entry_dir = {
    bottom: 1,
    left: 2,
    top: 3,
    right: 0,
  };

  /* first, detect whether we need any outer frame */
  if (!settings.noFrame) {
    // assume threshold is defined
    if (requireLineFrame(data, settings.threshold!)) {
      if (settings.linearRing) {
        polygons.push([
          [0, 0],
          [0, rows],
          [cols, rows],
          [cols, 0],
          [0, 0],
        ]);
      } else {
        polygons.push([
          [0, 0],
          [0, rows],
          [cols, rows],
          [cols, 0],
        ]);
      }
    }
  }

  /* finally, start tracing back first polygon(s) */

  cellGrid.forEach(function (a, i) {
    a.forEach(function (cell, j) {
      /* trace paths for all available edges that go through this cell */
      for (let e = 0; e < 4; e++) {
        const nextedge = valid_entries[e];

        if (typeof cell?.edges[nextedge] !== "object") continue;

        /* start a new, full path */
        let ee = cell.edges[nextedge],
          enter = nextedge,
          x = i,
          y = j,
          finalized = false;

        const path: Path = [],
          origin: Coord = [i + ee.path[0][0], j + ee.path[0][1]];

        /* add start coordinate */
        path.push(origin);

        /* start traceback */
        while (!finalized) {
          let cc = cellGrid[x][y];

          if (typeof cc?.edges[enter] !== "object") break;

          ee = cc.edges[enter]!; // assume edge is defined

          /* remove edge from cell */
          delete cc.edges[enter];

          /* add last point of edge to path arra, since we extend a polygon */
          const point = ee.path[1];
          point[0] += x;
          point[1] += y;
          path.push(point);

          enter = ee.move.enter;
          x = x + ee.move.x;
          y = y + ee.move.y;

          /* handle out-of-grid moves */
          if (
            typeof cellGrid[x] === "undefined" ||
            typeof cellGrid[x][y] === "undefined"
          ) {
            if (!settings.linearRing) break;

            let dir: 0 | 1 | 2 | 3 = 0,
              count = 0;

            if (x === cols) {
              x--;
              dir = 0; /* move downwards */
            } else if (x < 0) {
              x++;
              dir = 2; /* move upwards */
            } else if (y === rows) {
              y--;
              dir = 3; /* move right */
            } else if (y < 0) {
              y++;
              dir = 1; /* move left */
            }

            if (x === i && y === j && dir === entry_dir[nextedge]) {
              finalized = true;
              enter = nextedge;
              break;
            }

            while (true) {
              let found_entry = false;

              if (count > 4)
                throw new Error(
                  "Direction change counter overflow! This should never happen!"
                );

              if (
                !(
                  typeof cellGrid[x] === "undefined" ||
                  typeof cellGrid[x][y] === "undefined"
                )
              ) {
                cc = cellGrid[x][y];

                /* check for re-entry */
                const ve = valid_entries[dir];
                if (typeof cc?.edges[ve] === "object") {
                  /* found re-entry */
                  ee = cc.edges[ve]!; // assume edge is defined
                  path.push(entry_coordinate(x, y, dir, ee.path));
                  enter = ve;
                  found_entry = true;
                  break;
                }
              }

              if (found_entry) {
                break;
              } else {
                path.push(skip_coordinate(x, y, dir));

                x += add_x[dir];
                y += add_y[dir];

                /* change direction if we'e moved out of grid again */
                if (
                  typeof cellGrid[x] === "undefined" ||
                  typeof cellGrid[x][y] === "undefined"
                ) {
                  if (
                    (dir === 0 && y < 0) ||
                    (dir === 1 && x < 0) ||
                    (dir === 2 && y === rows) ||
                    (dir === 3 && x === cols)
                  ) {
                    x -= add_x[dir];
                    y -= add_y[dir];

                    dir = (dir + 1) % 4;
                    count++;
                  }
                }

                if (x === i && y === j && dir === entry_dir[nextedge]) {
                  /* we are back where we started off, so finalize the polygon */
                  finalized = true;
                  enter = nextedge;
                  break;
                }
              }
            }
          }
        }

        if (
          settings.linearRing &&
          (path[path.length - 1][0] !== origin[0] ||
            path[path.length - 1][1] !== origin[1])
        )
          path.push(origin);

        polygons.push(path);
      } /* end forall entry sites */
    }); /* end foreach i */
  }); /* end foreach j */

  return polygons;
}

export { cell2Polygons, traceBandPaths, traceLinePaths };
