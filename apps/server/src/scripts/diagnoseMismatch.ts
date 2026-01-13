import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tableName = 'store_locations';
  const physicalTableName = `custom_${tableName}`;

  console.log(`--- Diagnosing table: ${tableName} ---`);

  // 1. Get Logical Definition
  const table = await prisma.customTable.findFirst({
    where: { name: tableName },
    include: { fields: true },
  });

  if (!table) {
    console.log(`Logical table '${tableName}' NOT FOUND.`);
  } else {
    console.log(`Logical Table Found. Fields:`);
    table.fields.forEach((f) => {
      console.log(` - Field: ${f.name}, DataType: ${f.dataType}, GeometryType: ${f.geometryType}`);
    });
  }

  // 2. Get Physical Schema
  console.log(`\n--- Physical Schema (${physicalTableName}) ---`);
  const columns: any[] = await prisma.$queryRaw`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = ${physicalTableName};
  `;

  if (columns.length === 0) {
    console.log(`Physical table '${physicalTableName}' NOT FOUND (or has no columns).`);
  } else {
    columns.forEach((c) => {
      console.log(` - Column: ${c.column_name}, DataType: ${c.data_type}, UDT: ${c.udt_name}`);
    });
  }

  // 3. Compare
  console.log(`\n--- Analysis ---`);
  if (table) {
    table.fields.forEach((f) => {
      const pCol = columns.find((c) => c.column_name === f.name);
      if (pCol) {
        const isLogicalGeom =
          f.dataType.includes('GEOMETRY') ||
          f.dataType.includes('POINT') ||
          f.dataType.includes('POLYGON');
        const isPhysicalGeom = pCol.data_type === 'USER-DEFINED' && pCol.udt_name === 'geometry'; // PostGIS geometry is usually udt_name='geometry'

        if (isPhysicalGeom && !isLogicalGeom) {
          console.log(
            `[MISMATCH FOUND] Field '${f.name}' is GEOMETRY in DB but '${f.dataType}' in Metadata.`
          );
        }
      }
    });
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
