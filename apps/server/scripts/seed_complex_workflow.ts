import { PrismaClient } from '@prisma/client';
import { createCustomTable } from '../src/services/customTable/customTableService.js';
import { CustomTableDefinition } from '../src/services/customTable/types.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding Complex Demo Workflow (Customer Risk)...');

  // 1. Create CUSTOMERS Table
  console.log('Creating Customers Table...');
  const customerDef: CustomTableDefinition = {
    name: 'customers',
    displayName: 'Customers',
    description: 'Customer database',
    icon: 'Users',
    fields: [
      { name: 'name', displayName: 'Full Name', dataType: 'TEXT', isRequired: true, order: 1 },
      {
        name: 'email',
        displayName: 'Email',
        dataType: 'TEXT',
        isRequired: true,
        isUnique: true,
        order: 2,
      },
      {
        name: 'risk_score',
        displayName: 'Risk Score',
        dataType: 'INTEGER',
        defaultValue: '0',
        order: 3,
      },
      { name: 'status', displayName: 'Status', dataType: 'TEXT', defaultValue: 'Active', order: 4 },
    ],
  };

  // Try/Catch in case it exists, but usually I'd check first.
  // createCustomTable throws if exists, so we'll wrap or check.
  let customersTable;
  try {
    customersTable = await createCustomTable(customerDef, 'system');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('Customers table exists, fetching...');
      customersTable = await prisma.customTable.findUnique({ where: { name: 'customers' } });
    } else {
      throw e;
    }
  }

  // 2. Create COMPLAINTS Table
  console.log('Creating Complaints Table...');
  const complaintsDef: CustomTableDefinition = {
    name: 'complaints',
    displayName: 'Customer Complaints',
    description: 'Incoming support tickets',
    icon: 'MessageSquare',
    fields: [
      {
        name: 'customer_email',
        displayName: 'Customer Email',
        dataType: 'TEXT',
        isRequired: true,
        order: 1,
      },
      {
        name: 'issue',
        displayName: 'Issue Description',
        dataType: 'TEXT',
        isRequired: true,
        order: 2,
      },
      {
        name: 'severity',
        displayName: 'Severity',
        dataType: 'TEXT',
        defaultValue: 'Low',
        validation: { options: ['Low', 'Medium', 'Critical'] },
        order: 3,
      },
    ],
  };

  let complaintsTable;
  try {
    complaintsTable = await createCustomTable(complaintsDef, 'system');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('Complaints table exists, fetching...');
      complaintsTable = await prisma.customTable.findUnique({ where: { name: 'complaints' } });
    } else {
      throw e;
    }
  }

  // 3. Create Complex Workflow
  console.log('Creating "Critical Complaint Risk Handler" Workflow...');

  const nodes = [
    {
      id: 'trigger-comp',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'New Complaint',
        triggerType: 'RECORD_CREATED',
        tableName: 'complaints',
      },
    },
    {
      id: 'cond-critical',
      type: 'condition',
      position: { x: 100, y: 300 },
      data: {
        label: 'Is Critical?',
        field: 'severity',
        operator: 'equals',
        value: 'Critical',
      },
    },
    {
      id: 'act-update-customer',
      type: 'action',
      position: { x: 300, y: 500 },
      data: {
        label: 'Flag Customer Risk',
        actionType: 'UPDATE', // <--- THE REQUESTED FEATURE
        tableName: 'customers',
        // Dynamic Query: Update Customer WHERE email = {{trigger.customer_email}}
        queryField: 'email',
        queryOperator: 'equals',
        queryValue: '{{trigger.customer_email}}',
        fields: [
          { key: 'status', value: 'At Risk' },
          { key: 'risk_score', value: '100' },
        ],
      },
    },
    {
      id: 'act-notify-team',
      type: 'action',
      position: { x: 300, y: 700 },
      data: {
        label: 'Notify Support Team',
        actionType: 'CREATE',
        tableName: 'notifications', // Assuming notifications table exists from previous demo
        fields: [
          {
            key: 'message',
            value: 'CRITICAL RISK: {{trigger.customer_email}} reported issue: {{trigger.issue}}',
          },
          { key: 'priority', value: 'HIGH' },
        ],
      },
    },
  ];

  const edges = [
    { id: 'e1', source: 'trigger-comp', target: 'cond-critical' },
    { id: 'e2', source: 'cond-critical', sourceHandle: 'true', target: 'act-update-customer' },
    { id: 'e3', source: 'act-update-customer', target: 'act-notify-team' }, // Chained action
  ];

  await prisma.workflow.create({
    data: {
      name: 'Critical Complaint Risk Handler',
      description: 'Updates customer status to At Risk when critical complaints occur',
      triggerType: 'RECORD_CREATED',
      tableId: complaintsTable!.id,
      isActive: true,
      nodes: nodes,
      edges: edges,
      createdBy: 'system',
    },
  });

  // 4. Seed some initial customers so we have something to update
  console.log('Seeding initial customers...');
  const customerService = await import('../src/services/customTable/customDataService.js');
  try {
    await customerService.insertData('customers', {
      name: 'John Doe',
      email: 'john@example.com',
      status: 'Active',
      risk_score: 0,
    });
    await customerService.insertData('customers', {
      name: 'Jane Smith',
      email: 'jane@example.com',
      status: 'Active',
      risk_score: 0,
    });
    console.log('   - Added John and Jane');
  } catch (e) {
    console.log('   - Customers might already exist');
  }

  console.log('✅ Complex Demo Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
