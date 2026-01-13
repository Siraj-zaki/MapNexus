import { PrismaClient } from '@prisma/client';
import { createCustomTable } from '../src/services/customTable/customTableService.js';
import { CustomTableDefinition } from '../src/services/customTable/types.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🚚 Seeding Grand Logistics Workflow (Geofencing & Multi-Table)...');

  // 1. Create VEHICLES Table
  const vehiclesDef: CustomTableDefinition = {
    name: 'fleet_vehicles',
    displayName: 'Fleet Vehicles',
    icon: 'Truck',
    fields: [
      {
        name: 'vehicle_id',
        displayName: 'Vehicle ID',
        dataType: 'TEXT',
        isRequired: true,
        isUnique: true,
        order: 1,
      },
      {
        name: 'status',
        displayName: 'Status',
        dataType: 'TEXT',
        defaultValue: 'In Transit',
        order: 2,
      },
      {
        name: 'location',
        displayName: 'GPS Location',
        dataType: 'GEOMETRY',
        geometryType: 'POINT',
        order: 3,
      },
      { name: 'driver', displayName: 'Driver Name', dataType: 'TEXT', order: 4 },
    ],
  };

  // 2. Create WAREHOUSES Table (Geofences)
  const warehousesDef: CustomTableDefinition = {
    name: 'warehouses',
    displayName: 'Warehouses',
    icon: 'Home',
    fields: [
      { name: 'name', displayName: 'Warehouse Name', dataType: 'TEXT', isRequired: true, order: 1 },
      {
        name: 'boundary',
        displayName: 'Geofence Boundary',
        dataType: 'GEOMETRY',
        geometryType: 'POLYGON',
        order: 2,
      },
    ],
  };

  // 3. Create ORDERS Table
  const ordersDef: CustomTableDefinition = {
    name: 'shipment_orders',
    displayName: 'Shipment Orders',
    icon: 'Clipboard',
    fields: [
      { name: 'order_id', displayName: 'Order ID', dataType: 'TEXT', isRequired: true, order: 1 },
      { name: 'vehicle_ref', displayName: 'Vehicle Ref', dataType: 'TEXT', order: 2 },
      {
        name: 'status',
        displayName: 'Order Status',
        dataType: 'TEXT',
        defaultValue: 'Pending',
        order: 3,
      },
    ],
  };

  // 4. Create AUDIT LOGS
  const auditDef: CustomTableDefinition = {
    name: 'audit_logs',
    displayName: 'Audit Logs',
    icon: 'FileText',
    fields: [
      { name: 'event', displayName: 'Event', dataType: 'TEXT', order: 1 },
      { name: 'details', displayName: 'Details', dataType: 'TEXT', order: 2 },
    ],
  };

  // Helper to create or fetch
  async function ensureTable(def: CustomTableDefinition) {
    try {
      return await createCustomTable(def, 'system');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log(`   - ${def.name} exists.`);
        return await prisma.customTable.findUnique({ where: { name: def.name } });
      }
      throw e;
    }
  }

  const tVehicles = await ensureTable(vehiclesDef);
  const tWarehouses = await ensureTable(warehousesDef);
  const tOrders = await ensureTable(ordersDef);
  const tAudit = await ensureTable(auditDef);

  // 5. Create "Arrival Processing" Workflow
  console.log('Creating "Auto-Arrival Processing" Workflow...');

  const nodes = [
    {
      id: 'trigger-gps',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'GPS Update',
        triggerType: 'RECORD_UPDATED', // Trigger on Update!
        tableName: 'fleet_vehicles',
      },
    },
    {
      id: 'cond-arrival',
      type: 'condition',
      position: { x: 100, y: 300 },
      data: {
        logic: 'AND',
        conditions: [
          // Condition 1: Must be In Transit
          { field: 'status', operator: 'equals', value: 'In Transit' },
          // Condition 2: Must be inside a Warehouse Geofence
          { field: 'location', operator: 'geo_within', value: 'warehouses' },
        ],
      },
    },
    {
      id: 'act-1-update-vehicle',
      type: 'action',
      position: { x: 400, y: 400 },
      data: {
        label: 'Mark Vehicle Arrived',
        actionType: 'UPDATE',
        tableName: 'fleet_vehicles',
        // Update the triggering record itself (where id = trigger.id)
        queryField: 'id', // Use ID to target specific record
        queryOperator: 'equals',
        queryValue: '{{trigger.id}}',
        fields: [{ key: 'status', value: 'Arrived' }],
      },
    },
    {
      id: 'act-2-update-orders',
      type: 'action',
      position: { x: 400, y: 600 },
      data: {
        label: 'Unlock Orders',
        actionType: 'UPDATE',
        tableName: 'shipment_orders',
        // Update orders carried by this vehicle
        queryField: 'vehicle_ref',
        queryOperator: 'equals',
        queryValue: '{{trigger.vehicle_id}}',
        fields: [{ key: 'status', value: 'Ready to Unload' }],
      },
    },
    {
      id: 'act-3-audit',
      type: 'action',
      position: { x: 400, y: 800 },
      data: {
        label: 'Log Arrival',
        actionType: 'CREATE',
        tableName: 'audit_logs',
        fields: [
          { key: 'event', value: 'Vehicle Arrival' },
          { key: 'details', value: 'Vehicle {{trigger.vehicle_id}} arrived at facility.' },
        ],
      },
    },
  ];

  const edges = [
    { id: 'e1', source: 'trigger-gps', target: 'cond-arrival' },
    { id: 'e2', source: 'cond-arrival', sourceHandle: 'true', target: 'act-1-update-vehicle' },
    { id: 'e3', source: 'act-1-update-vehicle', target: 'act-2-update-orders' },
    { id: 'e4', source: 'act-2-update-orders', target: 'act-3-audit' },
  ];

  await prisma.workflow.create({
    data: {
      name: 'Auto-Arrival Processing',
      description: 'Geofence-based arrival automation',
      triggerType: 'RECORD_UPDATED',
      tableId: tVehicles!.id,
      isActive: true,
      nodes: nodes,
      edges: edges,
      createdBy: 'system',
    },
  });

  // 6. Seed Data (Warehouse + Vehicle)
  console.log('Seeding Scenario Data...');
  const dataService = await import('../src/services/customTable/customDataService.js');

  // A. Create Warehouse (Polygon roughly around Null Island for test, or a real spot)
  // Let's make a square 0,0 to 1,1
  const warehousePoly = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0],
        [0, 0],
      ],
    ],
  };

  await dataService.insertData('warehouses', {
    name: 'Central Depot',
    boundary: warehousePoly,
  });

  // B. Create Vehicle (At 0.5, 0.5 - INSIDE)
  // But wait, the workflow triggers on UPDATE. So we insert it "Outside" first, then update it "Inside" later to test?
  // Or just create it now, and subsequent updates trigger it.
  await dataService.insertData('fleet_vehicles', {
    vehicle_id: 'TRUCK-99',
    status: 'In Transit', // Matches Condition 1
    driver: 'Bob',
    location: { type: 'Point', coordinates: [0.5, 0.5] }, // Matches Condition 2
  });

  // C. Create Order
  await dataService.insertData('shipment_orders', {
    order_id: 'ORD-555',
    vehicle_ref: 'TRUCK-99',
    status: 'Pending',
  });

  console.log('✅ Logistics Demo Seeding Complete!');
  console.log(
    'ℹ️ To trigger the workflow manually in simple test: Update TRUCK-99 (even without changing values, just Save) to fire the RECORD_UPDATED trigger.'
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
