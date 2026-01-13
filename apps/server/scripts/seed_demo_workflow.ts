import { PrismaClient } from '@prisma/client';
import { createCustomTable } from '../src/services/customTable/customTableService.js';
import { CustomTableDefinition } from '../src/services/customTable/types.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Professional Demo Workflow...');

  // 0. CLEANUP (Optional: remove if you want to preserve data)
  console.log('Cleaning up old data...');
  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS custom_inventory_history CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS custom_inventory CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS custom_notifications_history CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS custom_notifications CASCADE;`);

    // Clean up metadata
    // await prisma.workflowExecutionContext.deleteMany({}); // DOES NOT EXIST
    await prisma.workflowExecution.deleteMany({});
    await prisma.workflow.deleteMany({});

    // Explicitly delete custom table metadata to allow recreation
    await prisma.customTable.deleteMany({
      where: { name: { in: ['inventory', 'notifications'] } },
    });
  } catch (e) {
    console.log('Cleanup minor error:', e);
  }

  // 1. Create INVENTORY Table via Service (triggers DDL)
  console.log('Creating Inventory Table...');
  const inventoryDef: CustomTableDefinition = {
    name: 'inventory',
    displayName: 'Inventory',
    description: 'Product inventory tracking',
    icon: 'Box',
    fields: [
      { name: 'item_name', displayName: 'Item Name', dataType: 'TEXT', isRequired: true, order: 1 },
      { name: 'category', displayName: 'Category', dataType: 'TEXT', order: 2 },
      { name: 'price', displayName: 'Price', dataType: 'INTEGER', order: 3 },
      { name: 'stock', displayName: 'Stock Level', dataType: 'INTEGER', order: 4 },
      {
        name: 'status',
        displayName: 'Status',
        dataType: 'TEXT',
        defaultValue: 'instock',
        order: 5,
      },
    ],
  };

  const inventoryTable = await createCustomTable(inventoryDef, 'system');

  // 2. Create NOTIFICATIONS Table via Service
  console.log('Creating Notifications Table...');
  const notificationDef: CustomTableDefinition = {
    name: 'notifications',
    displayName: 'System Notifications',
    description: 'Automated system alerts',
    icon: 'Bell',
    fields: [
      { name: 'message', displayName: 'Message', dataType: 'TEXT', isRequired: true, order: 1 },
      {
        name: 'priority',
        displayName: 'Priority',
        dataType: 'TEXT',
        defaultValue: 'INFO',
        order: 2,
      },
      {
        name: 'is_read',
        displayName: 'Read Status',
        dataType: 'BOOLEAN',
        defaultValue: 'false',
        order: 3,
      },
    ],
  };

  const notificationsTable = await createCustomTable(notificationDef, 'system');

  // 3. Create WORKFLOW
  console.log('Creating "High Value Item Alert" Workflow...');

  const nodes = [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'New Inventory Item',
        triggerType: 'RECORD_CREATED',
        tableName: 'inventory',
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 100, y: 300 },
      data: {
        label: 'Price > 1000',
        field: 'price',
        operator: 'gt',
        value: '1000',
      },
    },
    {
      id: 'action-true',
      type: 'action',
      position: { x: 300, y: 500 },
      data: {
        label: 'Create High Priority Alert',
        actionType: 'CREATE',
        tableName: 'notifications',
        fields: [
          {
            key: 'message',
            value: 'High Value Item Added: {{trigger.item_name}} (Category: {{trigger.category}})',
          },
          { key: 'priority', value: 'HIGH' },
        ],
      },
    },
    {
      id: 'action-false',
      type: 'action',
      position: { x: -100, y: 500 },
      data: {
        label: 'Log Standard Info',
        actionType: 'CREATE',
        tableName: 'notifications',
        fields: [
          { key: 'message', value: 'Standard Item Added: {{trigger.item_name}}' },
          { key: 'priority', value: 'LOW' },
        ],
      },
    },
  ];

  const edges = [
    { id: 'e1-2', source: 'trigger-1', target: 'condition-1' },
    { id: 'e2-true', source: 'condition-1', sourceHandle: 'true', target: 'action-true' },
    { id: 'e2-false', source: 'condition-1', sourceHandle: 'false', target: 'action-false' },
  ];

  await prisma.workflow.create({
    data: {
      name: 'High Value Inventory Processor',
      description: 'Automatically flags items over $1000',
      triggerType: 'RECORD_CREATED',
      tableId: inventoryTable.id,
      isActive: true,
      nodes: nodes,
      edges: edges,
      createdBy: 'system',
    },
  });

  console.log('✅ Seeding Complete! Refresh the dashboard.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
