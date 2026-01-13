import { PrismaClient } from '@prisma/client';
import { buildTableQuery } from '../services/reporting/queryBuilder';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Editable Report Update Flow...');

  const tableName = 'inventory_stock';
  const fullTableName = 'custom_inventory_stock';

  // 1. Fetch Data (Simulation of Report Viewer load)
  // Config provided columns but NOT ID, to test the recent fix
  console.log('1. Fetching data (Simulating Report Viewer)...');
  const result = await buildTableQuery(tableName, {
    columns: ['product_name', 'stock_level'], // ID intentionally omitted
    limit: 1,
  });

  const row = result.data[0];
  console.log('Fetched Row:', row);

  if (!row.id) {
    console.error('❌ FAIL: Row does not contain ID even after fix!');
    process.exit(1);
  }
  console.log(`✅ Success: Row has ID: ${row.id}`);

  // 2. Perform Update (Simulation of Save)
  const newStock = Math.floor(Math.random() * 500);
  console.log(`2. Updating stock_level to ${newStock} for ID ${row.id}...`);

  // Direct DB update simulation (normally via API)
  await prisma.$executeRawUnsafe(
    `UPDATE "${fullTableName}" SET stock_level = $1 WHERE id = $2::uuid`,
    newStock,
    row.id
  );

  // 3. Re-Fetch to Verify Persistence
  console.log('3. Re-fetching to verify...');
  const verifyResult = await buildTableQuery(tableName, {
    columns: ['stock_level'],
    filters: [{ field: 'id', operator: 'eq', value: row.id }],
  });

  const updatedRow = verifyResult.data[0];
  console.log('Updated Row:', updatedRow);

  if (Number(updatedRow.stock_level) === newStock) {
    console.log('✅ SUCCESS: Data persisted correctly!');
  } else {
    console.error(`❌ FAIL: Expected ${newStock}, got ${updatedRow.stock_level}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
