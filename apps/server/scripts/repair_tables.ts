import { PrismaClient } from '@prisma/client';
import {
  generateCreateTableSQL,
  generateHistoryTableSQL,
  generateHistoryTriggerSQL,
  generateIndexesSQL,
} from '../src/services/customTable/customTableService.js';
import {
  generateGeometryColumnsSQL,
  generateSpatialIndexesSQL,
} from '../src/services/customTable/postgisHelpers.js';
import { CustomTableWithFields } from '../src/services/customTable/types.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting Table Repair Process...');

  // 1. Fetch all metadata
  const tables = (await prisma.customTable.findMany({
    include: {
      fields: {
        orderBy: { order: 'asc' },
      },
    },
  })) as CustomTableWithFields[];

  console.log(`Found ${tables.length} table definitions in metadata.`);

  for (const table of tables) {
    const physicalTableName = `custom_${table.name}`;

    // 2. Check if physical table exists
    const checkSql = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '${physicalTableName}'
            );
        `;

    const result: any[] = await prisma.$queryRawUnsafe(checkSql);
    const exists = result[0]?.exists;

    if (exists) {
      console.log(`✅ Table '${table.name}' (${physicalTableName}) exists. Skipping.`);
      continue;
    }

    console.log(`⚠️ Table '${table.name}' is MISSING physical table. recreating...`);

    // 3. Recreate Table Logic (lifted from createCustomTable)
    try {
      // Need to map the Prisma "CustomField" back to "CustomFieldDefinition" structure expected by generators
      // Fortunately they are very similar.
      const definition = {
        name: table.name,
        displayName: table.displayName,
        description: table.description || '',
        icon: table.icon || 'Table',
        fields: table.fields.map((f) => ({
          ...f,
          validation: f.validation as any,
          iotConfig: f.iotConfig as any,
        })),
      };

      const createTableSQL = generateCreateTableSQL(definition);
      const historyTableSQL = generateHistoryTableSQL(definition.name, definition);
      const historyTriggerSQLs = generateHistoryTriggerSQL(definition.name, definition.fields);
      const indexesSQL = generateIndexesSQL(definition.name, definition.fields);

      const geometryColumnsSQL = generateGeometryColumnsSQL(physicalTableName, definition.fields);
      const spatialIndexesSQL = generateSpatialIndexesSQL(physicalTableName, definition.fields);
      const historyGeometryColumnsSQL = generateGeometryColumnsSQL(
        `${physicalTableName}_history`,
        definition.fields
      );

      // Execute SQL
      await prisma.$executeRawUnsafe(createTableSQL);
      console.log(`   - Created main table`);

      for (const sql of geometryColumnsSQL) {
        await prisma.$executeRawUnsafe(sql);
      }

      await prisma.$executeRawUnsafe(historyTableSQL);
      console.log(`   - Created history table`);

      for (const sql of historyGeometryColumnsSQL) {
        await prisma.$executeRawUnsafe(sql);
      }

      for (const sql of historyTriggerSQLs) {
        await prisma.$executeRawUnsafe(sql);
      }

      if (indexesSQL) {
        await prisma.$executeRawUnsafe(indexesSQL);
      }

      for (const sql of spatialIndexesSQL) {
        await prisma.$executeRawUnsafe(sql);
      }

      console.log(`🎉 Successfully repaired '${table.name}'`);
    } catch (error) {
      console.error(`❌ Failed to repair '${table.name}':`, error);
    }
  }

  console.log('🏁 Repair Process Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
