import * as interpolate from "./interpolation.js";
import { SuccessCallback } from "./common.js";

interface Options {
  successCallback?: SuccessCallback;
  verbose?: boolean;
  polygons?: boolean;
  linearRing?: boolean;
  noQuadTree?: boolean;
  noFrame?: boolean;
}

class InternalOptions implements Options {
  /* Settings common to all implemented algorithms */
  successCallback: SuccessCallback | undefined;
  verbose: boolean = false;
  polygons: boolean = false;
  polygons_full: boolean = false;
  linearRing: boolean = true;
  noQuadTree: boolean = false;
  noFrame: boolean = false;

  threshold?: number;
}

class IsoLineOptions extends InternalOptions {
  /* add interpolation functions (not yet user customizable) */
  interpolate = interpolate.linear;
}

class IsoBandOptions extends InternalOptions {
  /* add interpolation functions (not yet user customizable) */
  interpolate = interpolate.linear_ab;
  interpolate_a = interpolate.linear_a;
  interpolate_b = interpolate.linear_b;

  minV?: number;
  maxV?: number;
}

/* Compose settings specific to IsoBands algorithm */
function isoBandOptions(userSettings: Options) {
  const bandOptions = new IsoBandOptions();
  type P = keyof Options;

  for (const key of Object.keys(bandOptions)) {
    const val = userSettings[key as P];
    if (typeof val !== "undefined" && val !== null) {
      bandOptions[key as P] = val as any;
    }
  }

  /* restore compatibility */
  bandOptions.polygons_full = !bandOptions.polygons;

  /* add interpolation functions (not yet user customizable) */
  bandOptions.interpolate = interpolate.linear_ab;
  bandOptions.interpolate_a = interpolate.linear_a;
  bandOptions.interpolate_b = interpolate.linear_b;

  return bandOptions;
}

/* Compose settings specific to IsoLines algorithm */
function isoLineOptions(userSettings: Options) {
  const lineOptions = new IsoLineOptions();
  type P = keyof Options;

  for (const key of Object.keys(lineOptions)) {
    const val = userSettings[key as P];
    if (typeof val !== "undefined" && val !== null) {
      lineOptions[key as P] = val as any;
    }
  }

  /* restore compatibility */
  lineOptions.polygons_full = !lineOptions.polygons;

  /* add interpolation functions (not yet user customizable) */
  lineOptions.interpolate = interpolate.linear;

  return lineOptions;
}

export {
  isoBandOptions,
  isoLineOptions,
  Options,
  InternalOptions,
  IsoBandOptions,
  IsoLineOptions,
};
