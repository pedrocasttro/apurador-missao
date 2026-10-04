import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import shp from 'shpjs';

const [statesZip, municipalitiesZip, outputDirectory] = process.argv.slice(2);
if (!statesZip || !municipalitiesZip || !outputDirectory) {
  throw new Error('Uso: node generate-president-map-assets.mjs <BR_UF.zip> <BR_Municipios.zip> <diretório de saída>');
}

function coordinatesOf(geometry) {
  if (!geometry) return [];
  return geometry.type === 'Polygon'
    ? geometry.coordinates
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates.flat()
      : [];
}

function simplify(points, tolerance) {
  if (points.length <= 4) return points;
  const squaredTolerance = tolerance ** 2;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    const [ax, ay] = points[first];
    const [bx, by] = points[last];
    const dx = bx - ax;
    const dy = by - ay;
    let maxDistance = squaredTolerance;
    let furthest = -1;
    for (let index = first + 1; index < last; index += 1) {
      const [px, py] = points[index];
      const ratio = dx === 0 && dy === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
      const distance = (px - (ax + ratio * dx)) ** 2 + (py - (ay + ratio * dy)) ** 2;
      if (distance > maxDistance) { maxDistance = distance; furthest = index; }
    }
    if (furthest >= 0) {
      keep[furthest] = 1;
      stack.push([first, furthest], [furthest, last]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

function createPath(feature, bounds, tolerance) {
  const latCenter = (bounds.minY + bounds.maxY) / 2;
  const longitudeFactor = Math.cos((latCenter * Math.PI) / 180);
  const project = ([longitude, latitude]) => [longitude * longitudeFactor, -latitude];
  const projected = (ring) => ring.map(project);
  const rings = coordinatesOf(feature.geometry).map(projected);
  const commands = [];
  for (const rawRing of rings) {
    const ring = simplify(rawRing, tolerance);
    if (ring.length < 4) continue;
    commands.push(`M${ring.map(([x, y]) => `${((x - bounds.minX) * bounds.scale + bounds.offsetX).toFixed(1)},${((y - bounds.minY) * bounds.scale + bounds.offsetY).toFixed(1)}`).join('L')}Z`);
  }
  return commands.join('');
}

function asset(collection, keyField, labelField, width, height, maxTolerance) {
  const allPoints = [];
  for (const feature of collection.features) {
    for (const ring of coordinatesOf(feature.geometry)) {
      for (const point of ring) allPoints.push(point);
    }
  }
  let minLatitude = Infinity;
  let maxLatitude = -Infinity;
  for (const [, latitude] of allPoints) {
    minLatitude = Math.min(minLatitude, latitude);
    maxLatitude = Math.max(maxLatitude, latitude);
  }
  const latCenter = (minLatitude + maxLatitude) / 2;
  const longitudeFactor = Math.cos((latCenter * Math.PI) / 180);
  const points = allPoints.map(([longitude, latitude]) => [longitude * longitudeFactor, -latitude]);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const padding = 8;
  const scale = Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY));
  const tolerance = Math.min(maxTolerance, 0.5 / scale);
  const bounds = { minX, minY, maxY, scale, offsetX: (width - (maxX - minX) * scale) / 2, offsetY: (height - (maxY - minY) * scale) / 2 };
  return {
    width,
    height,
    source: 'IBGE Malha Municipal Digital 2025',
    features: collection.features.map((feature) => ({
      id: String(feature.properties[keyField]),
      label: String(feature.properties[labelField]),
      d: createPath(feature, bounds, tolerance),
    })),
  };
}

const statesCollection = await shp(await readFile(resolve(statesZip)));
const municipalitiesCollection = await shp(await readFile(resolve(municipalitiesZip)));
const output = resolve(outputDirectory);
await mkdir(output, { recursive: true });
for (const [name, value] of [
  ['brazil-states-2025.json', asset(statesCollection, 'SIGLA_UF', 'NM_UF', 900, 610, 0.03)],
]) {
  const path = resolve(output, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`);
  console.log(`${path}: ${value.features.length} áreas`);
}

const municipalitiesByUf = Map.groupBy(municipalitiesCollection.features, (feature) => String(feature.properties.SIGLA_UF).toLowerCase());
for (const [uf, features] of municipalitiesByUf) {
  const path = resolve(output, `municipalities-${uf}-2025.json`);
  const value = asset({ features }, 'CD_MUN', 'NM_MUN', 900, 610, 0.005);
  await writeFile(path, `${JSON.stringify(value)}\n`);
  console.log(`${path}: ${value.features.length} municípios`);
}
