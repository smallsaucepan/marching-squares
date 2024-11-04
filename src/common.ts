type SuccessCallback = (
  pathArray: any,
  thresholdOrlowerBound: number,
  bandWidth?: number
) => void;

type Ring = number[][];

type Path = number[][];

type LineEnterVia = "top" | "right" | "bottom" | "left";

interface LineEdge {
  path: Path;
  move: {
    x: number;
    y: number;
    enter: LineEnterVia;
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

type BandEnterVia = "tl" | "tr" | "br" | "bl" | "lt" | "rt" | "rb" | "lb";

interface BandEdge {
  path: Path;
  move: {
    x: number;
    y: number;
    enter: BandEnterVia;
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
  SuccessCallback,
  Ring,
  LineCell,
  BandCell,
  BandCellGrid,
  LineCellGrid,
  Path,
  BandEnterVia as BandEntryVia,
  LineEnterVia as LineEntryVia,
  LineEdge,
  BandEdge,
};
