export type { ShapeType, GeometryParams, GeometryResult } from './types';

import type { ShapeType, GeometryParams, GeometryResult } from './types';
import { generateChannelGeometry } from './channelGeometry';
import { generateTubeGeometry } from './tubeGeometry';
import { generatePlateGeometry } from './plateGeometry';
import { generateBandGeometry } from './bandGeometry';
import { generateSpicaGeometry } from './spicaGeometry';

export function generateSplintGeometry(
  shapeType: ShapeType,
  params: GeometryParams
): GeometryResult {
  switch (shapeType) {
    case 'tube':
      return generateTubeGeometry(params);
    case 'plate':
      return generatePlateGeometry(params);
    case 'band':
      return generateBandGeometry(params);
    case 'spica':
      return generateSpicaGeometry(params);
    case 'channel':
    default:
      return generateChannelGeometry(params);
  }
}
