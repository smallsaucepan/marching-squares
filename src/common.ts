type SuccessCallback = (
  pathArray: (Ring | Ring[])[],
  thresholdOrlowerBound: number,
  bandWidth?: number
) => void;

type Coord = [number, number];

type Ring = Coord[];

type Path = Coord[];

type LineEntry = "top" | "right" | "bottom" | "left";

interface LineEdge {
  path: Path;
  move: {
    x: number;
    y: number;
    enter: LineEntry;
  };
}

interface LineCell {
  cval: number;
  polygons: Ring[];
  edges: {
    top?: LineEdge;
    right?: LineEdge;
    bottom?: LineEdge;
    left?: LineEdge;
  };
  x0: number;
  x1: number;
  x2: number;
  x3: number;
}

type LineCellGrid = Array<Array<LineCell | undefined>>;

type BandEntry = "tl" | "tr" | "br" | "bl" | "lt" | "rt" | "rb" | "lb";

interface BandEdge {
  path: Path;
  move: {
    x: number;
    y: number;
    enter: BandEntry;
  };
}

interface BandCell {
  cval: number;
  polygons: Ring[];
  edges: {
    tl?: BandEdge;
    tr?: BandEdge;
    br?: BandEdge;
    bl?: BandEdge;
    lt?: BandEdge;
    rt?: BandEdge;
    rb?: BandEdge;
    lb?: BandEdge;
  };
  x0: number;
  x1: number;
  x2: number;
  x3: number;
  x: number;
  y: number;
}

type BandCellGrid = Array<Array<BandCell | undefined>>;

export {
  Coord,
  SuccessCallback,
  Path,
  Ring,
  LineEntry,
  LineEdge,
  LineCell,
  LineCellGrid,
  BandEntry,
  BandEdge,
  BandCell,
  BandCellGrid,
};
