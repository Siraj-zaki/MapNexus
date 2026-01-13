/**
 * Seed Script: Professional Custom Tables with Sample Data
 *
 * Creates standardized tables for:
 * - Retail (Products, Inventory)
 * - Assets (Equipment, Maintenance)
 * - IoT (Sensors, Readings)
 * - Indoor (Zones, Beacons)
 *
 * Also performs CRUD operations to generate history records.
 *
 * Usage: npx ts-node scripts/seedCustomTables.ts
 */

import { PrismaClient } from '@prisma/client';

import { insertData as insertDataService } from '../src/services/customTable/customDataService';
import { createCustomTable } from '../src/services/customTable/customTableService';

const prisma = new PrismaClient();

// ============================================================================
// TABLE DEFINITIONS
// ============================================================================

const TABLES = [
  // 1. RETAIL - Products
  {
    name: 'products',
    displayName: 'Products',
    description: 'Product catalog with pricing, categories, and inventory tracking',
    icon: '📦',
    fields: [
      {
        name: 'sku',
        displayName: 'SKU',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'name',
        displayName: 'Product Name',
        dataType: 'VARCHAR',
        maxLength: 200,
        isRequired: true,
        order: 1,
      },
      {
        name: 'category',
        displayName: 'Category',
        dataType: 'VARCHAR',
        maxLength: 100,
        isRequired: true,
        order: 2,
      },
      {
        name: 'price',
        displayName: 'Price',
        dataType: 'DECIMAL',
        precision: 10,
        scale: 2,
        isRequired: true,
        order: 3,
      },
      { name: 'cost', displayName: 'Cost', dataType: 'DECIMAL', precision: 10, scale: 2, order: 4 },
      {
        name: 'quantity',
        displayName: 'Quantity',
        dataType: 'INTEGER',
        isRequired: true,
        order: 5,
      },
      {
        name: 'min_stock',
        displayName: 'Min Stock Level',
        dataType: 'INTEGER',
        defaultValue: '10',
        order: 6,
      },
      {
        name: 'is_active',
        displayName: 'Active',
        dataType: 'BOOLEAN',
        defaultValue: 'true',
        order: 7,
      },
      { name: 'description', displayName: 'Description', dataType: 'TEXT', order: 8 },
    ],
  },

  // 2. RETAIL - Store Locations
  {
    name: 'store_locations',
    displayName: 'Store Locations',
    description: 'Physical store locations with geographic coordinates',
    icon: '🏪',
    fields: [
      {
        name: 'store_code',
        displayName: 'Store Code',
        dataType: 'VARCHAR',
        maxLength: 20,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'name',
        displayName: 'Store Name',
        dataType: 'VARCHAR',
        maxLength: 100,
        isRequired: true,
        order: 1,
      },
      { name: 'address', displayName: 'Address', dataType: 'TEXT', isRequired: true, order: 2 },
      { name: 'city', displayName: 'City', dataType: 'VARCHAR', maxLength: 100, order: 3 },
      { name: 'region', displayName: 'Region', dataType: 'VARCHAR', maxLength: 100, order: 4 },
      {
        name: 'location',
        displayName: 'Location',
        dataType: 'GEOMETRY_POINT',
        srid: 4326,
        geometryType: 'POINT',
        order: 5,
      },
      { name: 'size_sqft', displayName: 'Size (sq ft)', dataType: 'INTEGER', order: 6 },
      { name: 'manager', displayName: 'Manager', dataType: 'VARCHAR', maxLength: 100, order: 7 },
      { name: 'phone', displayName: 'Phone', dataType: 'VARCHAR', maxLength: 20, order: 8 },
      {
        name: 'is_open',
        displayName: 'Is Open',
        dataType: 'BOOLEAN',
        defaultValue: 'true',
        order: 9,
      },
    ],
  },

  // 3. ASSETS - Equipment
  {
    name: 'equipment',
    displayName: 'Equipment',
    description: 'Fixed and movable equipment assets with location tracking',
    icon: '🔧',
    fields: [
      {
        name: 'asset_tag',
        displayName: 'Asset Tag',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'name',
        displayName: 'Equipment Name',
        dataType: 'VARCHAR',
        maxLength: 200,
        isRequired: true,
        order: 1,
      },
      { name: 'category', displayName: 'Category', dataType: 'VARCHAR', maxLength: 100, order: 2 },
      {
        name: 'manufacturer',
        displayName: 'Manufacturer',
        dataType: 'VARCHAR',
        maxLength: 100,
        order: 3,
      },
      { name: 'model', displayName: 'Model', dataType: 'VARCHAR', maxLength: 100, order: 4 },
      {
        name: 'serial_number',
        displayName: 'Serial Number',
        dataType: 'VARCHAR',
        maxLength: 100,
        order: 5,
      },
      { name: 'purchase_date', displayName: 'Purchase Date', dataType: 'DATE', order: 6 },
      {
        name: 'purchase_price',
        displayName: 'Purchase Price',
        dataType: 'DECIMAL',
        precision: 10,
        scale: 2,
        order: 7,
      },
      {
        name: 'location',
        displayName: 'Location',
        dataType: 'GEOMETRY_POINT',
        srid: 4326,
        geometryType: 'POINT',
        order: 8,
      },
      {
        name: 'status',
        displayName: 'Status',
        dataType: 'VARCHAR',
        maxLength: 50,
        defaultValue: 'active',
        order: 9,
      },
      { name: 'last_maintenance', displayName: 'Last Maintenance', dataType: 'DATE', order: 10 },
      { name: 'notes', displayName: 'Notes', dataType: 'TEXT', order: 11 },
    ],
  },

  // 4. IOT - Temperature Sensors
  {
    name: 'temperature_sensors',
    displayName: 'Temperature Sensors',
    description: 'IoT temperature monitoring devices with location and config',
    icon: '🌡️',
    fields: [
      {
        name: 'sensor_id',
        displayName: 'Sensor ID',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'name',
        displayName: 'Sensor Name',
        dataType: 'VARCHAR',
        maxLength: 100,
        isRequired: true,
        order: 1,
      },
      { name: 'zone', displayName: 'Zone', dataType: 'VARCHAR', maxLength: 100, order: 2 },
      {
        name: 'location',
        displayName: 'Location',
        dataType: 'GEOMETRY_POINT',
        srid: 4326,
        geometryType: 'POINT',
        order: 3,
      },
      {
        name: 'current_reading',
        displayName: 'Current Reading',
        dataType: 'IOT_SENSOR',
        iotConfig: { sensorType: 'temperature', unit: '°C', minValue: -40, maxValue: 85 },
        order: 4,
      },
      {
        name: 'min_threshold',
        displayName: 'Min Threshold',
        dataType: 'DECIMAL',
        precision: 5,
        scale: 2,
        order: 5,
      },
      {
        name: 'max_threshold',
        displayName: 'Max Threshold',
        dataType: 'DECIMAL',
        precision: 5,
        scale: 2,
        order: 6,
      },
      {
        name: 'is_active',
        displayName: 'Active',
        dataType: 'BOOLEAN',
        defaultValue: 'true',
        order: 7,
      },
      { name: 'last_calibration', displayName: 'Last Calibration', dataType: 'DATE', order: 8 },
      { name: 'battery_level', displayName: 'Battery Level (%)', dataType: 'INTEGER', order: 9 },
    ],
  },

  // 5. INDOOR - Zones
  {
    name: 'indoor_zones',
    displayName: 'Indoor Zones',
    description: 'Indoor floor plan zones with polygon boundaries',
    icon: '🗺️',
    fields: [
      {
        name: 'zone_id',
        displayName: 'Zone ID',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'name',
        displayName: 'Zone Name',
        dataType: 'VARCHAR',
        maxLength: 100,
        isRequired: true,
        order: 1,
      },
      { name: 'floor', displayName: 'Floor', dataType: 'INTEGER', isRequired: true, order: 2 },
      { name: 'building', displayName: 'Building', dataType: 'VARCHAR', maxLength: 100, order: 3 },
      { name: 'zone_type', displayName: 'Zone Type', dataType: 'VARCHAR', maxLength: 50, order: 4 },
      {
        name: 'boundary',
        displayName: 'Boundary',
        dataType: 'GEOMETRY_POLYGON',
        srid: 4326,
        geometryType: 'POLYGON',
        order: 5,
      },
      {
        name: 'area_sqm',
        displayName: 'Area (sq m)',
        dataType: 'DECIMAL',
        precision: 10,
        scale: 2,
        order: 6,
      },
      { name: 'capacity', displayName: 'Capacity', dataType: 'INTEGER', order: 7 },
      {
        name: 'is_restricted',
        displayName: 'Restricted Access',
        dataType: 'BOOLEAN',
        defaultValue: 'false',
        order: 8,
      },
      { name: 'metadata', displayName: 'Metadata', dataType: 'JSONB', order: 9 },
    ],
  },

  // 6. INDOOR - Beacons
  {
    name: 'beacons',
    displayName: 'BLE Beacons',
    description: 'Bluetooth Low Energy beacons for indoor positioning',
    icon: '📡',
    fields: [
      {
        name: 'beacon_id',
        displayName: 'Beacon ID',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      { name: 'uuid', displayName: 'UUID', dataType: 'UUID', isRequired: true, order: 1 },
      { name: 'major', displayName: 'Major', dataType: 'INTEGER', isRequired: true, order: 2 },
      { name: 'minor', displayName: 'Minor', dataType: 'INTEGER', isRequired: true, order: 3 },
      { name: 'name', displayName: 'Name', dataType: 'VARCHAR', maxLength: 100, order: 4 },
      {
        name: 'location',
        displayName: 'Location',
        dataType: 'GEOMETRY_POINT',
        srid: 4326,
        geometryType: 'POINT',
        order: 5,
      },
      { name: 'floor', displayName: 'Floor', dataType: 'INTEGER', order: 6 },
      { name: 'tx_power', displayName: 'TX Power (dBm)', dataType: 'INTEGER', order: 7 },
      { name: 'battery_level', displayName: 'Battery Level (%)', dataType: 'INTEGER', order: 8 },
      { name: 'last_seen', displayName: 'Last Seen', dataType: 'TIMESTAMPTZ', order: 9 },
      {
        name: 'is_active',
        displayName: 'Active',
        dataType: 'BOOLEAN',
        defaultValue: 'true',
        order: 10,
      },
    ],
  },
];

// ============================================================================
// SAMPLE DATA
// ============================================================================

const PRODUCTS_DATA = [
  {
    sku: 'SKU-001',
    name: 'Wireless Keyboard',
    category: 'Electronics',
    price: 49.99,
    cost: 25.0,
    quantity: 150,
    min_stock: 20,
    is_active: true,
    description: 'Slim wireless keyboard with Bluetooth connectivity',
  },
  {
    sku: 'SKU-002',
    name: 'Ergonomic Mouse',
    category: 'Electronics',
    price: 34.99,
    cost: 15.0,
    quantity: 200,
    min_stock: 30,
    is_active: true,
    description: 'Ergonomic wireless mouse with adjustable DPI',
  },
  {
    sku: 'SKU-003',
    name: '27" Monitor',
    category: 'Electronics',
    price: 299.99,
    cost: 180.0,
    quantity: 45,
    min_stock: 10,
    is_active: true,
    description: '27-inch 4K IPS display with HDR support',
  },
  {
    sku: 'SKU-004',
    name: 'USB-C Hub',
    category: 'Accessories',
    price: 59.99,
    cost: 28.0,
    quantity: 120,
    min_stock: 25,
    is_active: true,
    description: '7-in-1 USB-C hub with HDMI and SD card reader',
  },
  {
    sku: 'SKU-005',
    name: 'Webcam HD',
    category: 'Electronics',
    price: 79.99,
    cost: 40.0,
    quantity: 80,
    min_stock: 15,
    is_active: true,
    description: '1080p HD webcam with built-in microphone',
  },
  {
    sku: 'SKU-006',
    name: 'Desk Lamp LED',
    category: 'Furniture',
    price: 44.99,
    cost: 18.0,
    quantity: 95,
    min_stock: 20,
    is_active: true,
    description: 'Adjustable LED desk lamp with dimmer',
  },
  {
    sku: 'SKU-007',
    name: 'Standing Desk Mat',
    category: 'Furniture',
    price: 89.99,
    cost: 45.0,
    quantity: 60,
    min_stock: 10,
    is_active: true,
    description: 'Anti-fatigue standing desk mat',
  },
  {
    sku: 'SKU-008',
    name: 'Cable Management Kit',
    category: 'Accessories',
    price: 24.99,
    cost: 8.0,
    quantity: 250,
    min_stock: 50,
    is_active: true,
    description: 'Complete cable management solution',
  },
];

const STORE_LOCATIONS_DATA = [
  {
    store_code: 'NYC-001',
    name: 'Manhattan Flagship',
    address: '350 5th Avenue',
    city: 'New York',
    region: 'Northeast',
    location: { type: 'Point', coordinates: [-73.9857, 40.7484] },
    size_sqft: 25000,
    manager: 'Sarah Johnson',
    phone: '+1-212-555-0101',
    is_open: true,
  },
  {
    store_code: 'LA-001',
    name: 'Beverly Hills Store',
    address: '9500 Wilshire Blvd',
    city: 'Los Angeles',
    region: 'West',
    location: { type: 'Point', coordinates: [-118.4065, 34.0736] },
    size_sqft: 18000,
    manager: 'Michael Chen',
    phone: '+1-310-555-0102',
    is_open: true,
  },
  {
    store_code: 'CHI-001',
    name: 'Chicago Downtown',
    address: '875 N Michigan Ave',
    city: 'Chicago',
    region: 'Midwest',
    location: { type: 'Point', coordinates: [-87.6244, 41.8977] },
    size_sqft: 15000,
    manager: 'Emily Rodriguez',
    phone: '+1-312-555-0103',
    is_open: true,
  },
  {
    store_code: 'MIA-001',
    name: 'Miami Beach',
    address: '1601 Collins Ave',
    city: 'Miami',
    region: 'Southeast',
    location: { type: 'Point', coordinates: [-80.13, 25.7907] },
    size_sqft: 12000,
    manager: 'Carlos Martinez',
    phone: '+1-305-555-0104',
    is_open: true,
  },
  {
    store_code: 'SEA-001',
    name: 'Seattle Pike Place',
    address: '85 Pike Street',
    city: 'Seattle',
    region: 'Northwest',
    location: { type: 'Point', coordinates: [-122.3405, 47.6097] },
    size_sqft: 10000,
    manager: 'Lisa Wang',
    phone: '+1-206-555-0105',
    is_open: true,
  },
];

const EQUIPMENT_DATA = [
  {
    asset_tag: 'EQ-001',
    name: 'Industrial Printer',
    category: 'Printing',
    manufacturer: 'Zebra',
    model: 'ZT620',
    serial_number: 'ZB12345678',
    purchase_date: '2023-03-15',
    purchase_price: 4500.0,
    location: { type: 'Point', coordinates: [-73.9857, 40.7484] },
    status: 'active',
    last_maintenance: '2024-01-10',
    notes: 'Main warehouse printer',
  },
  {
    asset_tag: 'EQ-002',
    name: 'Forklift',
    category: 'Material Handling',
    manufacturer: 'Toyota',
    model: '8FGU25',
    serial_number: 'TY98765432',
    purchase_date: '2022-06-20',
    purchase_price: 28000.0,
    location: { type: 'Point', coordinates: [-73.985, 40.748] },
    status: 'active',
    last_maintenance: '2024-02-15',
    notes: 'Warehouse A forklift',
  },
  {
    asset_tag: 'EQ-003',
    name: 'HVAC Unit',
    category: 'Climate Control',
    manufacturer: 'Carrier',
    model: '50XC',
    serial_number: 'CR11223344',
    purchase_date: '2021-11-10',
    purchase_price: 15000.0,
    location: { type: 'Point', coordinates: [-73.986, 40.749] },
    status: 'active',
    last_maintenance: '2024-03-01',
    notes: 'Rooftop unit - Zone A',
  },
  {
    asset_tag: 'EQ-004',
    name: 'Pallet Jack',
    category: 'Material Handling',
    manufacturer: 'Crown',
    model: 'PTH50',
    serial_number: 'CW55667788',
    purchase_date: '2023-01-05',
    purchase_price: 3200.0,
    location: { type: 'Point', coordinates: [-73.9855, 40.7485] },
    status: 'active',
    last_maintenance: '2024-01-20',
    notes: 'Electric pallet jack',
  },
  {
    asset_tag: 'EQ-005',
    name: 'Security Camera',
    category: 'Security',
    manufacturer: 'Hikvision',
    model: 'DS-2CD2185',
    serial_number: 'HK99887766',
    purchase_date: '2023-08-12',
    purchase_price: 450.0,
    location: { type: 'Point', coordinates: [-73.9852, 40.7482] },
    status: 'active',
    last_maintenance: null,
    notes: 'Entrance camera',
  },
];

const TEMPERATURE_SENSORS_DATA = [
  {
    sensor_id: 'TEMP-001',
    name: 'Cold Storage A',
    zone: 'Warehouse-Cold',
    location: { type: 'Point', coordinates: [-73.9857, 40.7484] },
    current_reading: { value: -18.5, timestamp: new Date().toISOString(), unit: '°C' },
    min_threshold: -22.0,
    max_threshold: -15.0,
    is_active: true,
    last_calibration: '2024-01-15',
    battery_level: 92,
  },
  {
    sensor_id: 'TEMP-002',
    name: 'Cold Storage B',
    zone: 'Warehouse-Cold',
    location: { type: 'Point', coordinates: [-73.9858, 40.7485] },
    current_reading: { value: -17.2, timestamp: new Date().toISOString(), unit: '°C' },
    min_threshold: -22.0,
    max_threshold: -15.0,
    is_active: true,
    last_calibration: '2024-01-15',
    battery_level: 88,
  },
  {
    sensor_id: 'TEMP-003',
    name: 'Server Room',
    zone: 'IT-Infrastructure',
    location: { type: 'Point', coordinates: [-73.986, 40.7486] },
    current_reading: { value: 21.3, timestamp: new Date().toISOString(), unit: '°C' },
    min_threshold: 18.0,
    max_threshold: 24.0,
    is_active: true,
    last_calibration: '2024-02-01',
    battery_level: 95,
  },
  {
    sensor_id: 'TEMP-004',
    name: 'Office Floor 1',
    zone: 'Office',
    location: { type: 'Point', coordinates: [-73.9855, 40.7483] },
    current_reading: { value: 22.8, timestamp: new Date().toISOString(), unit: '°C' },
    min_threshold: 20.0,
    max_threshold: 26.0,
    is_active: true,
    last_calibration: '2024-02-01',
    battery_level: 78,
  },
  {
    sensor_id: 'TEMP-005',
    name: 'Loading Dock',
    zone: 'Logistics',
    location: { type: 'Point', coordinates: [-73.985, 40.748] },
    current_reading: { value: 15.5, timestamp: new Date().toISOString(), unit: '°C' },
    min_threshold: 10.0,
    max_threshold: 30.0,
    is_active: true,
    last_calibration: '2024-01-20',
    battery_level: 65,
  },
];

const INDOOR_ZONES_DATA = [
  {
    zone_id: 'ZONE-001',
    name: 'Main Lobby',
    floor: 1,
    building: 'HQ Building',
    zone_type: 'Public',
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [-73.986, 40.748],
          [-73.985, 40.748],
          [-73.985, 40.749],
          [-73.986, 40.749],
          [-73.986, 40.748],
        ],
      ],
    },
    area_sqm: 250.0,
    capacity: 100,
    is_restricted: false,
    metadata: { wifi_ssid: 'Guest-WiFi', emergency_exit: 'North' },
  },
  {
    zone_id: 'ZONE-002',
    name: 'Conference Room A',
    floor: 2,
    building: 'HQ Building',
    zone_type: 'Meeting',
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [-73.9858, 40.7482],
          [-73.9855, 40.7482],
          [-73.9855, 40.7485],
          [-73.9858, 40.7485],
          [-73.9858, 40.7482],
        ],
      ],
    },
    area_sqm: 45.0,
    capacity: 12,
    is_restricted: false,
    metadata: { av_equipment: true, video_conferencing: true },
  },
  {
    zone_id: 'ZONE-003',
    name: 'Server Room',
    floor: 0,
    building: 'HQ Building',
    zone_type: 'Restricted',
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [-73.986, 40.7486],
          [-73.9857, 40.7486],
          [-73.9857, 40.7488],
          [-73.986, 40.7488],
          [-73.986, 40.7486],
        ],
      ],
    },
    area_sqm: 80.0,
    capacity: 5,
    is_restricted: true,
    metadata: { security_level: 'high', fire_suppression: 'FM200' },
  },
  {
    zone_id: 'ZONE-004',
    name: 'Cafeteria',
    floor: 1,
    building: 'HQ Building',
    zone_type: 'Amenity',
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [-73.9852, 40.7478],
          [-73.9848, 40.7478],
          [-73.9848, 40.7482],
          [-73.9852, 40.7482],
          [-73.9852, 40.7478],
        ],
      ],
    },
    area_sqm: 180.0,
    capacity: 80,
    is_restricted: false,
    metadata: { food_service: true, hours: '7am-7pm' },
  },
  {
    zone_id: 'ZONE-005',
    name: 'Open Office Area',
    floor: 3,
    building: 'HQ Building',
    zone_type: 'Workspace',
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [-73.9862, 40.748],
          [-73.9855, 40.748],
          [-73.9855, 40.749],
          [-73.9862, 40.749],
          [-73.9862, 40.748],
        ],
      ],
    },
    area_sqm: 500.0,
    capacity: 60,
    is_restricted: false,
    metadata: { desk_count: 60, standing_desks: 15 },
  },
];

const BEACONS_DATA = [
  {
    beacon_id: 'BCN-001',
    uuid: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e',
    major: 1,
    minor: 1,
    name: 'Lobby Entrance',
    location: { type: 'Point', coordinates: [-73.9857, 40.7484] },
    floor: 1,
    tx_power: -59,
    battery_level: 95,
    last_seen: new Date().toISOString(),
    is_active: true,
  },
  {
    beacon_id: 'BCN-002',
    uuid: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e',
    major: 1,
    minor: 2,
    name: 'Elevator Bank',
    location: { type: 'Point', coordinates: [-73.9858, 40.7485] },
    floor: 1,
    tx_power: -59,
    battery_level: 88,
    last_seen: new Date().toISOString(),
    is_active: true,
  },
  {
    beacon_id: 'BCN-003',
    uuid: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e',
    major: 2,
    minor: 1,
    name: 'Conference Room A',
    location: { type: 'Point', coordinates: [-73.9856, 40.7483] },
    floor: 2,
    tx_power: -65,
    battery_level: 72,
    last_seen: new Date().toISOString(),
    is_active: true,
  },
  {
    beacon_id: 'BCN-004',
    uuid: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e',
    major: 2,
    minor: 2,
    name: 'Conference Room B',
    location: { type: 'Point', coordinates: [-73.9854, 40.7484] },
    floor: 2,
    tx_power: -65,
    battery_level: 81,
    last_seen: new Date().toISOString(),
    is_active: true,
  },
  {
    beacon_id: 'BCN-005',
    uuid: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e',
    major: 3,
    minor: 1,
    name: 'Cafeteria',
    location: { type: 'Point', coordinates: [-73.985, 40.748] },
    floor: 1,
    tx_power: -59,
    battery_level: 67,
    last_seen: new Date().toISOString(),
    is_active: true,
  },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

let systemUserId: string;

async function getOrCreateSystemUser(): Promise<string> {
  // Try to find an existing user
  const existingUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (existingUser) {
    return existingUser.id;
  }

  // Create a system user for seeding
  const user = await prisma.user.create({
    data: {
      email: 'system@indoor-map.local',
      name: 'System',
      password: 'not-for-login',
      role: 'ADMIN',
    },
  });

  return user.id;
}

async function createTable(tableData: (typeof TABLES)[0]) {
  console.log(`Creating table: ${tableData.displayName}...`);

  // Check if table already exists
  const existing = await prisma.customTable.findFirst({
    where: { name: tableData.name },
    include: { fields: true },
  });

  if (existing) {
    console.log(`  Table ${tableData.name} already exists, skipping...`);
    return existing;
  }

  // Use service to create table (ensures consistency with application logic)
  const table = await createCustomTable(tableData as any, systemUserId);

  console.log(`  ✓ Created table: ${tableData.displayName}`);
  return table;
}

async function insertData(tableName: string, records: any[], tableId: string, fields: any[]) {
  console.log(`Inserting ${records.length} records into ${tableName}...`);

  const insertedIds: string[] = [];

  for (const record of records) {
    try {
      // Use service to insert data (handles GeoJSON conversion and validation)
      // Note: service expects tableName without 'custom_' prefix, calls it with prefix internally
      const result = await insertDataService(tableName, record);
      if (result?.id) {
        insertedIds.push(result.id);
      }
    } catch (e: any) {
      console.log(`  Warning inserting record: ${e.message}`);
    }
  }

  console.log(`  ✓ Inserted ${insertedIds.length} records`);
  return insertedIds;
}

async function generateHistory(tableName: string, recordIds: string[], tableId: string) {
  console.log(`Generating history for ${tableName}...`);

  if (recordIds.length === 0) return;

  // The simplified generateHistory relies on the database triggers created by createCustomTable.
  // We just need to perform UPDATE and DELETE operations, and the DB handles the logging.

  // Update some records
  const updateCount = Math.min(3, recordIds.length);
  for (let i = 0; i < updateCount; i++) {
    const id = recordIds[i];

    // Update the record
    await prisma.$executeRawUnsafe(
      `UPDATE "custom_${tableName}" SET updated_at = NOW() WHERE id = $1`,
      id
    );
  }

  // Soft delete one record if we have enough
  if (recordIds.length > 3) {
    const deleteId = recordIds[recordIds.length - 1];

    // Actually delete (soft delete via deleted_at)
    await prisma.$executeRawUnsafe(
      `UPDATE "custom_${tableName}" SET deleted_at = NOW() WHERE id = $1`,
      deleteId
    );
  }

  console.log(`  ✓ Generated history entries (via DB triggers)`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Starting Custom Tables Seed Script\n');
  console.log('='.repeat(60));

  try {
    // Get or create system user for createdBy field
    systemUserId = await getOrCreateSystemUser();
    console.log(`Using user ID: ${systemUserId}\n`);

    // Create tables and insert data
    for (const tableData of TABLES) {
      console.log(`\n📋 ${tableData.displayName}`);
      console.log('-'.repeat(40));

      const table = await createTable(tableData);

      // Get sample data based on table name
      let sampleData: any[] = [];
      switch (tableData.name) {
        case 'products':
          sampleData = PRODUCTS_DATA;
          break;
        case 'store_locations':
          sampleData = STORE_LOCATIONS_DATA;
          break;
        case 'equipment':
          sampleData = EQUIPMENT_DATA;
          break;
        case 'temperature_sensors':
          sampleData = TEMPERATURE_SENSORS_DATA;
          break;
        case 'indoor_zones':
          sampleData = INDOOR_ZONES_DATA;
          break;
        case 'beacons':
          sampleData = BEACONS_DATA;
          break;
      }

      const recordIds = await insertData(tableData.name, sampleData, table.id, table.fields);
      // await generateHistory(tableData.name, recordIds, table.id);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Seed completed successfully!\n');

    // Summary
    const tableCount = await prisma.customTable.count();
    console.log('📊 Summary:');
    console.log(`   - ${tableCount} custom tables created`);
    // console.log(`   - ${historyCount} history entries generated`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
