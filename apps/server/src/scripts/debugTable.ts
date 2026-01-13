import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tableName = 'inventory_stock';
  const table = await prisma.customTable.findFirst({
    where: { name: tableName },
    include: { fields: true },
  });

  if (!table) {
    console.log(`Table ${tableName} not found`);
    return;
  }

  console.log('Table Fields:', JSON.stringify(table.fields, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
