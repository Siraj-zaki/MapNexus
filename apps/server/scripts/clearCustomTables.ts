import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.customTable.deleteMany({}).then(async () => {
  console.log('Deleted metadata');

  // Drop known physical tables to ensure clean slate
  const tables = [
    'products',
    'store_locations',
    'equipment',
    'temperature_sensors',
    'indoor_zones',
    'beacons',
  ];

  for (const table of tables) {
    try {
      await p.$executeRawUnsafe(`DROP TABLE IF EXISTS "custom_${table}" CASCADE`);
      await p.$executeRawUnsafe(`DROP TABLE IF EXISTS "custom_${table}_history" CASCADE`);
      console.log(`Dropped custom_${table}`);
    } catch (e) {
      console.log(`Error dropping ${table}:`, e);
    }
  }

  p.$disconnect();
});
