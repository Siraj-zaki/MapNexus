import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KNOWN_GEOMETRY_TYPES = [
  'GEOMETRY_POINT',
  'GEOMETRY_POLYGON',
  'GEOMETRY_LINESTRING',
  'GEOMETRY_MULTIPOINT',
  'GEOMETRY_MULTIPOLYGON',
  // Standard PostGIS types just in case
  'POINT',
  'LINESTRING',
  'POLYGON',
  'MULTIPOINT',
  'MULTILINESTRING',
  'MULTIPOLYGON',
  'GEOMETRY',
];

async function main() {
  const tables = await prisma.customTable.findMany({
    include: { fields: true },
  });

  console.log('--- Checking for unrecognized geometry types ---');
  let found = false;

  for (const table of tables) {
    for (const field of table.fields) {
      const upperType = field.dataType.toUpperCase();

      const isKnown = KNOWN_GEOMETRY_TYPES.includes(upperType);

      const looksLikeGeometry =
        upperType.includes('GEO') ||
        upperType.includes('POINT') ||
        upperType.includes('POLYGON') ||
        upperType.includes('LINESTRING');

      if (looksLikeGeometry && !isKnown) {
        console.log(
          `[WARNING] Table '${table.name}' field '${field.name}' has suspicious dataType: '${field.dataType}'`
        );
        found = true;
      }

      if (isKnown) {
        // console.log(`[INFO] Table '${table.name}' field '${field.name}' is recognized geometry: '${field.dataType}'`);
      }
    }
  }

  if (!found) {
    console.log('No unrecognized geometry types found.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
