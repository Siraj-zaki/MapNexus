import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Report Data and Templates...');

  const userId = (await prisma.user.findFirst())?.id;
  if (!userId) {
    console.error(
      '❌ No user found. Please look for a user in the database or run basic seed first.'
    );
    return;
  }

  try {
    // Ensure PostGIS first
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis;`);
  } catch (e) {
    console.log('⚠️  PostGIS extension might already exist or permissions defined.');
  }

  // Force Clean (for development/demo)
  console.log('🧹 Cleaning up old custom tables...');
  await prisma.customTable.deleteMany({
    where: { name: { in: ['retail_sales', 'inventory_stock', 'iot_devices', 'store_locations'] } },
  });

  // ==========================================
  // 1. RETAIL SALES (Detail, Summary)
  // ==========================================
  const retailTableName = 'retail_sales';
  const customRetailTable = 'custom_retail_sales';

  // Metadata
  let retailTable = await prisma.customTable.findFirst({ where: { name: retailTableName } });
  if (!retailTable) {
    retailTable = await prisma.customTable.create({
      data: {
        name: retailTableName,
        displayName: 'Retail Sales',
        description: 'Transaction records for retail stores',
        createdBy: userId,
        fields: {
          create: [
            {
              name: 'transaction_date',
              displayName: 'Date',
              dataType: 'TIMESTAMP',
              isRequired: true,
              isTimeseries: true,
            },
            { name: 'store_id', displayName: 'Store ID', dataType: 'VARCHAR', maxLength: 50 },
            {
              name: 'product_category',
              displayName: 'Category',
              dataType: 'VARCHAR',
              maxLength: 50,
            },
            { name: 'amount', displayName: 'Amount', dataType: 'DECIMAL', precision: 10, scale: 2 },
            {
              name: 'payment_method',
              displayName: 'Payment Method',
              dataType: 'VARCHAR',
              maxLength: 20,
            },
            { name: 'status', displayName: 'Status', dataType: 'VARCHAR', maxLength: 20 },
          ],
        },
      },
      include: { fields: true },
    });

    // Create Physical Table
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${customRetailTable}"`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${customRetailTable}" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "transaction_date" TIMESTAMP NOT NULL DEFAULT NOW(),
        "store_id" VARCHAR(50),
        "product_category" VARCHAR(50),
        "amount" DECIMAL(10, 2),
        "payment_method" VARCHAR(20),
        "status" VARCHAR(20),
        "deleted_at" TIMESTAMP
      )
    `);

    // Seed Data
    const categories = ['Electronics', 'Clothing', 'Home', 'Groceries', 'Books'];
    const payments = ['Credit Card', 'Cash', 'Mobile Pay'];
    const statuses = ['Completed', 'Refunded', 'Pending'];

    const salesValues: string[] = [];
    for (let i = 0; i < 200; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 60)); // Last 60 days
      const cat = categories[Math.floor(Math.random() * categories.length)];

      salesValues.push(`(
          '${date.toISOString()}', 
          'STORE_${Math.floor(Math.random() * 5) + 1}', 
          '${cat}', 
          ${(Math.random() * 200 + 10).toFixed(2)}, 
          '${payments[Math.floor(Math.random() * payments.length)]}', 
          '${statuses[Math.floor(Math.random() * statuses.length)]}'
        )`);
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO "${customRetailTable}" ("transaction_date", "store_id", "product_category", "amount", "payment_method", "status")
      VALUES ${salesValues.join(', ')}
    `);
    console.log(`✅ Created and seeded ${retailTableName}`);
  }

  // ==========================================
  // 2. INVENTORY (Editable)
  // ==========================================
  const inventoryTableName = 'inventory_stock';
  const customInventoryTable = 'custom_inventory_stock';

  let inventoryTable = await prisma.customTable.findFirst({ where: { name: inventoryTableName } });
  if (!inventoryTable) {
    inventoryTable = await prisma.customTable.create({
      data: {
        name: inventoryTableName,
        displayName: 'Inventory Stock',
        description: 'Current stock levels',
        createdBy: userId,
        fields: {
          create: [
            {
              name: 'product_name',
              displayName: 'Product',
              dataType: 'VARCHAR',
              maxLength: 100,
              isRequired: true,
            },
            { name: 'category', displayName: 'Category', dataType: 'VARCHAR', maxLength: 50 },
            { name: 'stock_level', displayName: 'Stock Level', dataType: 'INTEGER' },
            { name: 'reorder_point', displayName: 'Reorder Point', dataType: 'INTEGER' },
            {
              name: 'location',
              displayName: 'Warehouse Location',
              dataType: 'VARCHAR',
              maxLength: 20,
            },
          ],
        },
      },
    });

    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${customInventoryTable}"`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${customInventoryTable}" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "product_name" VARCHAR(100),
        "category" VARCHAR(50),
        "stock_level" INTEGER,
        "reorder_point" INTEGER,
        "location" VARCHAR(20),
        "deleted_at" TIMESTAMP
      )
    `);

    // Seed Data
    const products = [
      { name: 'Laptop Pro X', cat: 'Electronics', stock: 15, reorder: 5 },
      { name: 'Wireless Mouse', cat: 'Electronics', stock: 120, reorder: 30 },
      { name: 'Cotton T-Shirt', cat: 'Clothing', stock: 500, reorder: 100 },
      { name: 'Jeans', cat: 'Clothing', stock: 200, reorder: 50 },
      { name: 'Coffee Maker', cat: 'Home', stock: 40, reorder: 10 },
      { name: 'Blender', cat: 'Home', stock: 25, reorder: 8 },
      { name: 'Apple', cat: 'Groceries', stock: 1000, reorder: 200 },
      { name: 'Milk', cat: 'Groceries', stock: 50, reorder: 20 },
    ];

    const invValues = products.map(
      (p) => `(
       '${p.name}', '${p.cat}', ${p.stock}, ${p.reorder}, 'ZONE_${String.fromCharCode(
        65 + Math.floor(Math.random() * 5)
      )}'
    )`
    );

    await prisma.$executeRawUnsafe(`
      INSERT INTO "${customInventoryTable}" ("product_name", "category", "stock_level", "reorder_point", "location")
      VALUES ${invValues.join(', ')}
    `);
    console.log(`✅ Created and seeded ${inventoryTableName}`);
  }

  // ==========================================
  // MAP REPORT OVERHAUL (Phase 14)
  // ==========================================
  console.log('🧹 Cleaning up old Map Reports & Tables...');

  // 1. Cleanup Old Tables & Reports
  // We remove 'iot_devices' and 'store_locations' etc as we are replacing them with the new Logistics Fleet demo
  const oldTables = [
    'store_locations',
    'competitor_locations',
    'fleet_history',
    'logistics_fleet',
    'iot_devices',
  ];
  await prisma.customTable.deleteMany({ where: { name: { in: oldTables } } });

  await prisma.reportTemplate.deleteMany({
    where: {
      name: {
        in: [
          'Store Locations Map',
          'Store Heatmap & Clusters',
          'Market Competitor Analysis',
          'Fleet Delivery Reconstruction',
          'Fleet Live Tracker',
          'Fleet History Playback',
          'Delivery Density Heatmap',
          'Sensor History Analysis',
          'Low Stock Alert (SQL)',
        ],
      },
    },
  });

  // 2. Create "Proper" Dynamic Table: Logistics Fleet
  // This represents a real-time tracking table that accumulates history
  const fleetTableName = 'logistics_fleet';
  const customFleetTable = 'custom_logistics_fleet';

  let fleetTable = await prisma.customTable.findFirst({ where: { name: fleetTableName } });
  if (!fleetTable) {
    fleetTable = await prisma.customTable.create({
      data: {
        name: fleetTableName,
        displayName: 'Logistics Fleet Tracking',
        description: 'Real-time and historical GPS tracking of delivery fleet',
        createdBy: userId,
        fields: {
          create: [
            { name: 'vehicle_id', displayName: 'Vehicle ID', dataType: 'VARCHAR', maxLength: 20 },
            { name: 'status', displayName: 'Status', dataType: 'VARCHAR', maxLength: 20 }, // Moving, Idle, Delivered
            { name: 'speed', displayName: 'Speed (mph)', dataType: 'INTEGER' },
            { name: 'heading', displayName: 'Heading (deg)', dataType: 'INTEGER' },
            {
              name: 'timestamp',
              displayName: 'Timestamp',
              dataType: 'TIMESTAMP',
              isTimeseries: true,
            },
            {
              name: 'location',
              displayName: 'GPS Coordinates',
              dataType: 'GEOMETRY',
              geometryType: 'POINT',
            },
          ],
        },
      },
    });

    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${customFleetTable}"`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${customFleetTable}" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "vehicle_id" VARCHAR(20),
        "status" VARCHAR(20),
        "speed" INTEGER,
        "heading" INTEGER,
        "timestamp" TIMESTAMP,
        "location" GEOMETRY(POINT, 4326),
        "deleted_at" TIMESTAMP
      )
    `);

    // 3. Seed Realistic Paths (Interpolated)
    console.log('📍 Seeding Route History...');
    const fleetValues: string[] = [];
    const vehicles = [
      { id: 'TRUCK-101', color: '#ef4444', start: [-122.398, 37.795], end: [-122.422, 37.765] }, // Downtown -> Mission
      { id: 'TRUCK-102', color: '#3b82f6', start: [-122.435, 37.802], end: [-122.41, 37.75] }, // Marina -> Bernal
      { id: 'VAN-005', color: '#22c55e', start: [-122.479, 37.81], end: [-122.4, 37.79] }, // Bridge -> FiDi
      { id: 'VAN-008', color: '#eab308', start: [-122.45, 37.76], end: [-122.39, 37.78] }, // Sunset -> SoMa
      { id: 'SCOOTER-9', color: '#a855f7', start: [-122.41, 37.78], end: [-122.42, 37.785] }, // Local Delivery
    ];

    const steps = 100; // 100 points per vehicle
    const now = new Date();

    vehicles.forEach((v) => {
      for (let i = 0; i <= steps; i++) {
        const t = 1 - i / steps; // 1.0 down to 0.0 (Reverse time)

        // Interpolate Position
        const lng = v.start[0] + (v.end[0] - v.start[0]) * (i / steps);
        const lat = v.start[1] + (v.end[1] - v.start[1]) * (i / steps);

        // Time (Last 4 hours)
        const time = new Date(now.getTime() - t * 4 * 60 * 60 * 1000);

        // Simulate Speed (slower at start/end)
        const speed = Math.floor(20 + Math.sin(i * 0.1) * 15);
        const status = speed < 5 ? 'Idle' : 'Moving';
        const heading = Math.floor(Math.random() * 360);

        fleetValues.push(`(
                '${v.id}',
                '${status}',
                ${speed},
                ${heading},
                '${time.toISOString()}',
                ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
            )`);
      }
    });

    // Bulk Insert
    // Split into chunks to avoid query size limits
    const chunkSize = 50;
    for (let i = 0; i < fleetValues.length; i += chunkSize) {
      const chunk = fleetValues.slice(i, i + chunkSize);
      await prisma.$executeRawUnsafe(`
          INSERT INTO "${customFleetTable}" ("vehicle_id", "status", "speed", "heading", "timestamp", "location")
          VALUES ${chunk.join(', ')}
        `);
    }
    console.log(`✅ Seeded ${fleetValues.length} historical points for ${fleetTableName}`);
  }

  // ==========================================
  // CREATE REPORTS
  // ==========================================

  // 1. Retail Sales Summary
  await upsertReport(prisma, userId, {
    name: 'Retail Sales Overview',
    type: 'SUMMARY',
    config: {
      name: 'Retail Sales Overview',
      dataSource: retailTableName,
      aggregations: [
        { id: '1', field: 'amount', function: 'SUM', label: 'Total Revenue' },
        { id: '2', field: 'id', function: 'COUNT', label: 'Transaction Count' },
      ],
      groupBy: ['product_category'],
      showChart: true,
      chartType: 'BAR',
    },
  });

  // 2. Recent Sales Detail
  await upsertReport(prisma, userId, {
    name: 'Recent Transactions',
    type: 'DETAIL',
    config: {
      name: 'Recent Transactions',
      dataSource: retailTableName,
      columns: ['transaction_date', 'store_id', 'product_category', 'amount', 'status'],
      filters: [],
      sortBy: [{ field: 'transaction_date', direction: 'desc' }],
      pageSize: 25,
      exportFormats: ['PDF', 'EXCEL'],
    },
  });

  // 3. Inventory Stock Editable
  await upsertReport(prisma, userId, {
    name: 'Inventory Manager',
    type: 'EDITABLE',
    config: {
      name: 'Inventory Manager',
      dataSource: inventoryTableName,
      columns: ['product_name', 'category', 'stock_level'], // For view
      editableColumns: ['stock_level', 'reorder_point', 'location'],
      readOnlyColumns: ['product_name', 'category'],
      allowAdd: true,
      allowDelete: true,
      requireConfirmation: true,
    },
  });

  // 4. Live Fleet View (Snapshot)
  await upsertReport(prisma, userId, {
    name: 'Fleet Live Tracker',
    type: 'MAP',
    config: {
      name: 'Fleet Live Tracker',
      mapStyle: 'STREETS',
      reportMode: 'SNAPSHOT',
      defaultCenter: [-122.4194, 37.7749],
      defaultZoom: 12,
      layers: [
        {
          id: 'active_vehicles',
          name: 'Active Vehicles',
          dataSource: fleetTableName,
          geometryField: 'location',
          markerStyle: 'ICON',
          markerColor: '#3b82f6',
          filters: [], // Show all
          popupFields: ['vehicle_id', 'speed', 'status', 'timestamp'],
        },
      ],
    },
  });

  // 5. Playback History
  await upsertReport(prisma, userId, {
    name: 'Fleet History Playback',
    type: 'MAP',
    config: {
      name: 'Fleet History Playback',
      reportMode: 'PLAYBACK',
      timeField: 'timestamp',
      playbackInterval: 'minute',
      mapStyle: 'DARK',
      defaultCenter: [-122.4194, 37.7749],
      defaultZoom: 11,
      layers: [
        {
          id: 'vehicle_history',
          name: 'Vehicle Paths',
          dataSource: fleetTableName,
          geometryField: 'location',
          markerStyle: 'CIRCLE',
          markerColor: '#eab308',
          showClustering: false,
          showHeatmap: false,
          popupFields: ['vehicle_id', 'speed', 'timestamp'],
        },
      ],
    },
  });

  // 6. Speed Heatmap
  await upsertReport(prisma, userId, {
    name: 'Delivery Density Heatmap',
    type: 'MAP',
    config: {
      name: 'Delivery Density Heatmap',
      reportMode: 'SNAPSHOT',
      mapStyle: 'SATELLITE',
      defaultCenter: [-122.4194, 37.7749],
      defaultZoom: 11,
      layers: [
        {
          id: 'density_heat',
          name: 'Traffic Density',
          dataSource: fleetTableName,
          geometryField: 'location',
          markerStyle: 'CIRCLE',
          showClustering: false,
          showHeatmap: true, // Only Heatmap
          filters: [],
          popupFields: [],
        },
      ],
    },
  });

  console.log('🎉 All reports and data seeded successfully!');
}

async function upsertReport(prisma: any, userId: string, data: any) {
  const existing = await prisma.reportTemplate.findFirst({ where: { name: data.name } });
  if (existing) {
    await prisma.reportTemplate.update({
      where: { id: existing.id },
      data: {
        type: data.type,
        config: data.config,
        layout: { lg: [] }, // Default layout
      },
    });
    console.log(`Updated report: ${data.name}`);
  } else {
    await prisma.reportTemplate.create({
      data: {
        name: data.name,
        description: 'Auto-generated seed report',
        type: data.type,
        config: data.config,
        layout: { lg: [] },
        createdBy: userId,
        paperSize: 'A4',
      },
    });
    console.log(`Created report: ${data.name}`);
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
