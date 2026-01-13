/**
 * Professional Industry Tables Seed Script
 *
 * Creates comprehensive tables for:
 * - Retail: Customers, Orders, Categories, Promotions
 * - Inventory: Warehouses, Stock Movements, Suppliers
 * - Assets: Maintenance Records, Asset Categories
 * - IoT: Device Registry, Alerts, Sensor Readings
 */

import { PrismaClient } from '@prisma/client';
import { insertData as insertDataService } from '../src/services/customTable/customDataService';
import { createCustomTable } from '../src/services/customTable/customTableService';

const prisma = new PrismaClient();
let systemUserId: string;

// ============================================================================
// TABLE DEFINITIONS
// ============================================================================

const TABLES = [
  // RETAIL - Customers
  {
    name: 'customers',
    displayName: 'Customers',
    description: 'Customer database with contact info and loyalty status',
    icon: '👥',
    fields: [
      {
        name: 'customer_id',
        displayName: 'Customer ID',
        dataType: 'VARCHAR',
        maxLength: 20,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'first_name',
        displayName: 'First Name',
        dataType: 'VARCHAR',
        maxLength: 100,
        isRequired: true,
        order: 1,
      },
      {
        name: 'last_name',
        displayName: 'Last Name',
        dataType: 'VARCHAR',
        maxLength: 100,
        isRequired: true,
        order: 2,
      },
      {
        name: 'email',
        displayName: 'Email',
        dataType: 'VARCHAR',
        maxLength: 255,
        isRequired: true,
        isUnique: true,
        order: 3,
      },
      { name: 'phone', displayName: 'Phone', dataType: 'VARCHAR', maxLength: 20, order: 4 },
      {
        name: 'loyalty_tier',
        displayName: 'Loyalty Tier',
        dataType: 'VARCHAR',
        maxLength: 20,
        defaultValue: 'Bronze',
        order: 5,
      },
      {
        name: 'total_spent',
        displayName: 'Total Spent',
        dataType: 'DECIMAL',
        precision: 12,
        scale: 2,
        order: 6,
      },
      {
        name: 'visit_count',
        displayName: 'Visit Count',
        dataType: 'INTEGER',
        defaultValue: '0',
        order: 7,
      },
      {
        name: 'registered_date',
        displayName: 'Registered Date',
        dataType: 'DATE',
        isRequired: true,
        order: 8,
      },
      {
        name: 'is_active',
        displayName: 'Active',
        dataType: 'BOOLEAN',
        defaultValue: 'true',
        order: 9,
      },
    ],
  },

  // RETAIL - Orders
  {
    name: 'orders',
    displayName: 'Orders',
    description: 'Sales orders with customer and payment details',
    icon: '🛒',
    fields: [
      {
        name: 'order_number',
        displayName: 'Order Number',
        dataType: 'VARCHAR',
        maxLength: 30,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'customer_email',
        displayName: 'Customer Email',
        dataType: 'VARCHAR',
        maxLength: 255,
        isRequired: true,
        order: 1,
      },
      {
        name: 'order_date',
        displayName: 'Order Date',
        dataType: 'TIMESTAMPTZ',
        isRequired: true,
        order: 2,
      },
      {
        name: 'status',
        displayName: 'Status',
        dataType: 'VARCHAR',
        maxLength: 30,
        isRequired: true,
        order: 3,
      },
      {
        name: 'subtotal',
        displayName: 'Subtotal',
        dataType: 'DECIMAL',
        precision: 10,
        scale: 2,
        isRequired: true,
        order: 4,
      },
      { name: 'tax', displayName: 'Tax', dataType: 'DECIMAL', precision: 10, scale: 2, order: 5 },
      {
        name: 'total',
        displayName: 'Total',
        dataType: 'DECIMAL',
        precision: 10,
        scale: 2,
        isRequired: true,
        order: 6,
      },
      {
        name: 'payment_method',
        displayName: 'Payment Method',
        dataType: 'VARCHAR',
        maxLength: 30,
        order: 7,
      },
      { name: 'shipping_address', displayName: 'Shipping Address', dataType: 'TEXT', order: 8 },
      { name: 'notes', displayName: 'Notes', dataType: 'TEXT', order: 9 },
    ],
  },

  // INVENTORY - Warehouses
  {
    name: 'warehouses',
    displayName: 'Warehouses',
    description: 'Warehouse and distribution center locations',
    icon: '🏭',
    fields: [
      {
        name: 'warehouse_code',
        displayName: 'Warehouse Code',
        dataType: 'VARCHAR',
        maxLength: 20,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'name',
        displayName: 'Name',
        dataType: 'VARCHAR',
        maxLength: 100,
        isRequired: true,
        order: 1,
      },
      { name: 'address', displayName: 'Address', dataType: 'TEXT', isRequired: true, order: 2 },
      { name: 'city', displayName: 'City', dataType: 'VARCHAR', maxLength: 100, order: 3 },
      { name: 'country', displayName: 'Country', dataType: 'VARCHAR', maxLength: 100, order: 4 },
      {
        name: 'location',
        displayName: 'Location',
        dataType: 'GEOMETRY_POINT',
        srid: 4326,
        geometryType: 'POINT',
        order: 5,
      },
      { name: 'capacity_sqft', displayName: 'Capacity (sq ft)', dataType: 'INTEGER', order: 6 },
      {
        name: 'current_utilization',
        displayName: 'Utilization %',
        dataType: 'DECIMAL',
        precision: 5,
        scale: 2,
        order: 7,
      },
      {
        name: 'manager_name',
        displayName: 'Manager',
        dataType: 'VARCHAR',
        maxLength: 100,
        order: 8,
      },
      {
        name: 'is_active',
        displayName: 'Active',
        dataType: 'BOOLEAN',
        defaultValue: 'true',
        order: 9,
      },
    ],
  },

  // INVENTORY - Suppliers
  {
    name: 'suppliers',
    displayName: 'Suppliers',
    description: 'Vendor and supplier management',
    icon: '🚚',
    fields: [
      {
        name: 'supplier_code',
        displayName: 'Supplier Code',
        dataType: 'VARCHAR',
        maxLength: 20,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'company_name',
        displayName: 'Company Name',
        dataType: 'VARCHAR',
        maxLength: 200,
        isRequired: true,
        order: 1,
      },
      {
        name: 'contact_name',
        displayName: 'Contact Name',
        dataType: 'VARCHAR',
        maxLength: 100,
        order: 2,
      },
      { name: 'email', displayName: 'Email', dataType: 'VARCHAR', maxLength: 255, order: 3 },
      { name: 'phone', displayName: 'Phone', dataType: 'VARCHAR', maxLength: 20, order: 4 },
      { name: 'address', displayName: 'Address', dataType: 'TEXT', order: 5 },
      { name: 'country', displayName: 'Country', dataType: 'VARCHAR', maxLength: 100, order: 6 },
      { name: 'lead_time_days', displayName: 'Lead Time (Days)', dataType: 'INTEGER', order: 7 },
      {
        name: 'rating',
        displayName: 'Rating',
        dataType: 'DECIMAL',
        precision: 3,
        scale: 2,
        order: 8,
      },
      {
        name: 'is_preferred',
        displayName: 'Preferred',
        dataType: 'BOOLEAN',
        defaultValue: 'false',
        order: 9,
      },
    ],
  },

  // ASSETS - Maintenance Records
  {
    name: 'maintenance_records',
    displayName: 'Maintenance Records',
    description: 'Equipment maintenance and service history',
    icon: '🔨',
    fields: [
      {
        name: 'ticket_number',
        displayName: 'Ticket Number',
        dataType: 'VARCHAR',
        maxLength: 30,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'asset_tag',
        displayName: 'Asset Tag',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        order: 1,
      },
      {
        name: 'maintenance_type',
        displayName: 'Type',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        order: 2,
      },
      { name: 'priority', displayName: 'Priority', dataType: 'VARCHAR', maxLength: 20, order: 3 },
      { name: 'scheduled_date', displayName: 'Scheduled Date', dataType: 'DATE', order: 4 },
      { name: 'completed_date', displayName: 'Completed Date', dataType: 'DATE', order: 5 },
      {
        name: 'technician',
        displayName: 'Technician',
        dataType: 'VARCHAR',
        maxLength: 100,
        order: 6,
      },
      { name: 'cost', displayName: 'Cost', dataType: 'DECIMAL', precision: 10, scale: 2, order: 7 },
      { name: 'description', displayName: 'Description', dataType: 'TEXT', order: 8 },
      {
        name: 'status',
        displayName: 'Status',
        dataType: 'VARCHAR',
        maxLength: 30,
        defaultValue: 'Pending',
        order: 9,
      },
    ],
  },

  // IOT - Device Registry
  {
    name: 'iot_devices',
    displayName: 'IoT Devices',
    description: 'Connected device registry and status',
    icon: '📱',
    fields: [
      {
        name: 'device_id',
        displayName: 'Device ID',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'device_name',
        displayName: 'Device Name',
        dataType: 'VARCHAR',
        maxLength: 100,
        isRequired: true,
        order: 1,
      },
      {
        name: 'device_type',
        displayName: 'Device Type',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        order: 2,
      },
      {
        name: 'manufacturer',
        displayName: 'Manufacturer',
        dataType: 'VARCHAR',
        maxLength: 100,
        order: 3,
      },
      { name: 'model', displayName: 'Model', dataType: 'VARCHAR', maxLength: 100, order: 4 },
      {
        name: 'firmware_version',
        displayName: 'Firmware',
        dataType: 'VARCHAR',
        maxLength: 50,
        order: 5,
      },
      {
        name: 'location',
        displayName: 'Location',
        dataType: 'GEOMETRY_POINT',
        srid: 4326,
        geometryType: 'POINT',
        order: 6,
      },
      { name: 'last_heartbeat', displayName: 'Last Heartbeat', dataType: 'TIMESTAMPTZ', order: 7 },
      {
        name: 'status',
        displayName: 'Status',
        dataType: 'VARCHAR',
        maxLength: 20,
        defaultValue: 'Online',
        order: 8,
      },
      { name: 'config', displayName: 'Configuration', dataType: 'JSONB', order: 9 },
    ],
  },

  // IOT - Alerts
  {
    name: 'iot_alerts',
    displayName: 'IoT Alerts',
    description: 'Device alerts and notifications',
    icon: '🚨',
    fields: [
      {
        name: 'alert_id',
        displayName: 'Alert ID',
        dataType: 'VARCHAR',
        maxLength: 30,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'device_id',
        displayName: 'Device ID',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        order: 1,
      },
      {
        name: 'alert_type',
        displayName: 'Alert Type',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        order: 2,
      },
      {
        name: 'severity',
        displayName: 'Severity',
        dataType: 'VARCHAR',
        maxLength: 20,
        isRequired: true,
        order: 3,
      },
      { name: 'message', displayName: 'Message', dataType: 'TEXT', isRequired: true, order: 4 },
      {
        name: 'triggered_at',
        displayName: 'Triggered At',
        dataType: 'TIMESTAMPTZ',
        isRequired: true,
        order: 5,
      },
      {
        name: 'acknowledged_at',
        displayName: 'Acknowledged At',
        dataType: 'TIMESTAMPTZ',
        order: 6,
      },
      { name: 'resolved_at', displayName: 'Resolved At', dataType: 'TIMESTAMPTZ', order: 7 },
      {
        name: 'assigned_to',
        displayName: 'Assigned To',
        dataType: 'VARCHAR',
        maxLength: 100,
        order: 8,
      },
      {
        name: 'status',
        displayName: 'Status',
        dataType: 'VARCHAR',
        maxLength: 20,
        defaultValue: 'Open',
        order: 9,
      },
    ],
  },

  // INVENTORY - Stock Movements
  {
    name: 'stock_movements',
    displayName: 'Stock Movements',
    description: 'Inventory transfers and adjustments',
    icon: '📊',
    fields: [
      {
        name: 'movement_id',
        displayName: 'Movement ID',
        dataType: 'VARCHAR',
        maxLength: 30,
        isRequired: true,
        isUnique: true,
        order: 0,
      },
      {
        name: 'sku',
        displayName: 'SKU',
        dataType: 'VARCHAR',
        maxLength: 50,
        isRequired: true,
        order: 1,
      },
      {
        name: 'movement_type',
        displayName: 'Type',
        dataType: 'VARCHAR',
        maxLength: 30,
        isRequired: true,
        order: 2,
      },
      {
        name: 'quantity',
        displayName: 'Quantity',
        dataType: 'INTEGER',
        isRequired: true,
        order: 3,
      },
      {
        name: 'from_location',
        displayName: 'From Location',
        dataType: 'VARCHAR',
        maxLength: 50,
        order: 4,
      },
      {
        name: 'to_location',
        displayName: 'To Location',
        dataType: 'VARCHAR',
        maxLength: 50,
        order: 5,
      },
      {
        name: 'reference_number',
        displayName: 'Reference',
        dataType: 'VARCHAR',
        maxLength: 50,
        order: 6,
      },
      {
        name: 'movement_date',
        displayName: 'Date',
        dataType: 'TIMESTAMPTZ',
        isRequired: true,
        order: 7,
      },
      {
        name: 'performed_by',
        displayName: 'Performed By',
        dataType: 'VARCHAR',
        maxLength: 100,
        order: 8,
      },
      { name: 'notes', displayName: 'Notes', dataType: 'TEXT', order: 9 },
    ],
  },
];

// ============================================================================
// SAMPLE DATA
// ============================================================================

const CUSTOMERS_DATA = [
  {
    customer_id: 'CUST-001',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@email.com',
    phone: '+1-555-0101',
    loyalty_tier: 'Gold',
    total_spent: 4520.5,
    visit_count: 45,
    registered_date: '2023-01-15',
  },
  {
    customer_id: 'CUST-002',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.j@email.com',
    phone: '+1-555-0102',
    loyalty_tier: 'Platinum',
    total_spent: 12350.0,
    visit_count: 120,
    registered_date: '2022-06-20',
  },
  {
    customer_id: 'CUST-003',
    first_name: 'Michael',
    last_name: 'Williams',
    email: 'm.williams@email.com',
    phone: '+1-555-0103',
    loyalty_tier: 'Bronze',
    total_spent: 890.25,
    visit_count: 12,
    registered_date: '2024-02-10',
  },
  {
    customer_id: 'CUST-004',
    first_name: 'Emily',
    last_name: 'Brown',
    email: 'emily.brown@email.com',
    phone: '+1-555-0104',
    loyalty_tier: 'Silver',
    total_spent: 2150.75,
    visit_count: 28,
    registered_date: '2023-08-05',
  },
  {
    customer_id: 'CUST-005',
    first_name: 'David',
    last_name: 'Garcia',
    email: 'd.garcia@email.com',
    phone: '+1-555-0105',
    loyalty_tier: 'Gold',
    total_spent: 5680.0,
    visit_count: 52,
    registered_date: '2022-11-30',
  },
];

const ORDERS_DATA = [
  {
    order_number: 'ORD-2024-0001',
    customer_email: 'john.smith@email.com',
    order_date: '2024-01-15T10:30:00Z',
    status: 'Delivered',
    subtotal: 249.99,
    tax: 20.0,
    total: 269.99,
    payment_method: 'Credit Card',
    shipping_address: '123 Main St, New York, NY 10001',
  },
  {
    order_number: 'ORD-2024-0002',
    customer_email: 'sarah.j@email.com',
    order_date: '2024-01-16T14:45:00Z',
    status: 'Shipped',
    subtotal: 589.5,
    tax: 47.16,
    total: 636.66,
    payment_method: 'PayPal',
    shipping_address: '456 Oak Ave, Los Angeles, CA 90001',
  },
  {
    order_number: 'ORD-2024-0003',
    customer_email: 'm.williams@email.com',
    order_date: '2024-01-17T09:15:00Z',
    status: 'Processing',
    subtotal: 129.99,
    tax: 10.4,
    total: 140.39,
    payment_method: 'Debit Card',
    shipping_address: '789 Pine Rd, Chicago, IL 60601',
  },
  {
    order_number: 'ORD-2024-0004',
    customer_email: 'emily.brown@email.com',
    order_date: '2024-01-18T16:20:00Z',
    status: 'Pending',
    subtotal: 399.0,
    tax: 31.92,
    total: 430.92,
    payment_method: 'Credit Card',
    shipping_address: '321 Elm St, Houston, TX 77001',
  },
  {
    order_number: 'ORD-2024-0005',
    customer_email: 'd.garcia@email.com',
    order_date: '2024-01-19T11:00:00Z',
    status: 'Delivered',
    subtotal: 1250.0,
    tax: 100.0,
    total: 1350.0,
    payment_method: 'Bank Transfer',
    shipping_address: '654 Cedar Ln, Phoenix, AZ 85001',
  },
];

const WAREHOUSES_DATA = [
  {
    warehouse_code: 'WH-EAST-01',
    name: 'East Coast Distribution Center',
    address: '100 Logistics Way, Newark, NJ 07101',
    city: 'Newark',
    country: 'USA',
    location: { type: 'Point', coordinates: [-74.1724, 40.7357] },
    capacity_sqft: 250000,
    current_utilization: 78.5,
    manager_name: 'Robert Chen',
  },
  {
    warehouse_code: 'WH-WEST-01',
    name: 'West Coast Fulfillment Hub',
    address: '500 Commerce Blvd, Los Angeles, CA 90058',
    city: 'Los Angeles',
    country: 'USA',
    location: { type: 'Point', coordinates: [-118.2437, 33.9425] },
    capacity_sqft: 320000,
    current_utilization: 82.3,
    manager_name: 'Maria Santos',
  },
  {
    warehouse_code: 'WH-CENT-01',
    name: 'Central Regional Warehouse',
    address: '200 Distribution Dr, Dallas, TX 75212',
    city: 'Dallas',
    country: 'USA',
    location: { type: 'Point', coordinates: [-96.8208, 32.8194] },
    capacity_sqft: 180000,
    current_utilization: 65.0,
    manager_name: 'James Wilson',
  },
  {
    warehouse_code: 'WH-SOUTH-01',
    name: 'Southeast Distribution',
    address: '300 Shipping Lane, Atlanta, GA 30318',
    city: 'Atlanta',
    country: 'USA',
    location: { type: 'Point', coordinates: [-84.4383, 33.7964] },
    capacity_sqft: 150000,
    current_utilization: 71.2,
    manager_name: 'Angela Thompson',
  },
];

const SUPPLIERS_DATA = [
  {
    supplier_code: 'SUP-001',
    company_name: 'TechParts Global Inc.',
    contact_name: 'Alex Kim',
    email: 'alex.kim@techparts.com',
    phone: '+1-888-555-0001',
    address: '1000 Industrial Pkwy, San Jose, CA 95131',
    country: 'USA',
    lead_time_days: 7,
    rating: 4.8,
    is_preferred: true,
  },
  {
    supplier_code: 'SUP-002',
    company_name: 'Premium Electronics Co.',
    contact_name: 'Lisa Wang',
    email: 'lwang@premiumelec.com',
    phone: '+86-21-5555-1234',
    address: '888 Tech Road, Shanghai 200120',
    country: 'China',
    lead_time_days: 21,
    rating: 4.5,
    is_preferred: true,
  },
  {
    supplier_code: 'SUP-003',
    company_name: 'EuroSupply GmbH',
    contact_name: 'Hans Mueller',
    email: 'h.mueller@eurosupply.de',
    phone: '+49-89-555-6789',
    address: 'Industriestr. 45, 80939 Munich',
    country: 'Germany',
    lead_time_days: 14,
    rating: 4.6,
    is_preferred: false,
  },
  {
    supplier_code: 'SUP-004',
    company_name: 'FastShip Logistics',
    contact_name: 'James Brown',
    email: 'jbrown@fastship.com',
    phone: '+1-800-555-FAST',
    address: '2500 Airport Way, Memphis, TN 38118',
    country: 'USA',
    lead_time_days: 3,
    rating: 4.2,
    is_preferred: false,
  },
];

const MAINTENANCE_DATA = [
  {
    ticket_number: 'MNT-2024-001',
    asset_tag: 'EQ-001',
    maintenance_type: 'Preventive',
    priority: 'Medium',
    scheduled_date: '2024-01-20',
    completed_date: '2024-01-20',
    technician: 'Mike Johnson',
    cost: 250.0,
    description: 'Quarterly calibration and cleaning',
    status: 'Completed',
  },
  {
    ticket_number: 'MNT-2024-002',
    asset_tag: 'EQ-002',
    maintenance_type: 'Repair',
    priority: 'High',
    scheduled_date: '2024-01-22',
    technician: 'Sarah Lee',
    cost: 1200.0,
    description: 'Hydraulic system repair',
    status: 'In Progress',
  },
  {
    ticket_number: 'MNT-2024-003',
    asset_tag: 'EQ-003',
    maintenance_type: 'Inspection',
    priority: 'Low',
    scheduled_date: '2024-02-01',
    technician: 'Tom Davis',
    description: 'Annual safety inspection',
    status: 'Scheduled',
  },
  {
    ticket_number: 'MNT-2024-004',
    asset_tag: 'EQ-001',
    maintenance_type: 'Emergency',
    priority: 'Critical',
    scheduled_date: '2024-01-25',
    completed_date: '2024-01-25',
    technician: 'Mike Johnson',
    cost: 850.0,
    description: 'Paper jam mechanism failure',
    status: 'Completed',
  },
];

const IOT_DEVICES_DATA = [
  {
    device_id: 'DEV-TEMP-001',
    device_name: 'Cold Storage Monitor A1',
    device_type: 'Temperature Sensor',
    manufacturer: 'SensorTech',
    model: 'ST-T100',
    firmware_version: '2.4.1',
    location: { type: 'Point', coordinates: [-73.9857, 40.7484] },
    last_heartbeat: '2024-01-20T10:30:00Z',
    status: 'Online',
    config: { interval: 60, threshold_min: -25, threshold_max: -18 },
  },
  {
    device_id: 'DEV-HUM-001',
    device_name: 'Humidity Sensor B2',
    device_type: 'Humidity Sensor',
    manufacturer: 'SensorTech',
    model: 'ST-H200',
    firmware_version: '1.8.3',
    location: { type: 'Point', coordinates: [-73.985, 40.748] },
    last_heartbeat: '2024-01-20T10:29:45Z',
    status: 'Online',
    config: { interval: 120, threshold_max: 70 },
  },
  {
    device_id: 'DEV-DOOR-001',
    device_name: 'Main Entrance Sensor',
    device_type: 'Door Sensor',
    manufacturer: 'SecureIO',
    model: 'SEC-D50',
    firmware_version: '3.1.0',
    location: { type: 'Point', coordinates: [-73.986, 40.749] },
    last_heartbeat: '2024-01-20T10:25:00Z',
    status: 'Online',
    config: { alert_on_open: true, auto_lock: 300 },
  },
  {
    device_id: 'DEV-MOTION-001',
    device_name: 'Warehouse Motion Detector',
    device_type: 'Motion Sensor',
    manufacturer: 'SecureIO',
    model: 'SEC-M100',
    firmware_version: '2.0.5',
    location: { type: 'Point', coordinates: [-73.9855, 40.7485] },
    last_heartbeat: '2024-01-20T09:45:00Z',
    status: 'Offline',
    config: { sensitivity: 'high', zone: 'A' },
  },
];

const IOT_ALERTS_DATA = [
  {
    alert_id: 'ALT-2024-0001',
    device_id: 'DEV-TEMP-001',
    alert_type: 'Temperature High',
    severity: 'Warning',
    message: 'Temperature exceeded threshold: -16°C (max: -18°C)',
    triggered_at: '2024-01-19T14:30:00Z',
    acknowledged_at: '2024-01-19T14:35:00Z',
    resolved_at: '2024-01-19T15:00:00Z',
    assigned_to: 'John Operator',
    status: 'Resolved',
  },
  {
    alert_id: 'ALT-2024-0002',
    device_id: 'DEV-MOTION-001',
    alert_type: 'Device Offline',
    severity: 'Critical',
    message: 'Device has not sent heartbeat for 45 minutes',
    triggered_at: '2024-01-20T10:30:00Z',
    assigned_to: 'IT Support',
    status: 'Open',
  },
  {
    alert_id: 'ALT-2024-0003',
    device_id: 'DEV-HUM-001',
    alert_type: 'Humidity High',
    severity: 'Info',
    message: 'Humidity level at 68% approaching threshold',
    triggered_at: '2024-01-20T08:15:00Z',
    status: 'Open',
  },
  {
    alert_id: 'ALT-2024-0004',
    device_id: 'DEV-DOOR-001',
    alert_type: 'Unauthorized Access',
    severity: 'Critical',
    message: 'Door opened outside business hours',
    triggered_at: '2024-01-18T02:30:00Z',
    acknowledged_at: '2024-01-18T02:32:00Z',
    resolved_at: '2024-01-18T02:45:00Z',
    assigned_to: 'Security Team',
    status: 'Resolved',
  },
];

const STOCK_MOVEMENTS_DATA = [
  {
    movement_id: 'MOV-2024-0001',
    sku: 'SKU-001',
    movement_type: 'Inbound',
    quantity: 500,
    to_location: 'WH-EAST-01',
    reference_number: 'PO-2024-100',
    movement_date: '2024-01-15T08:00:00Z',
    performed_by: 'Warehouse Staff',
  },
  {
    movement_id: 'MOV-2024-0002',
    sku: 'SKU-002',
    movement_type: 'Transfer',
    quantity: 100,
    from_location: 'WH-EAST-01',
    to_location: 'WH-WEST-01',
    reference_number: 'TRF-2024-001',
    movement_date: '2024-01-16T10:30:00Z',
    performed_by: 'Logistics Team',
  },
  {
    movement_id: 'MOV-2024-0003',
    sku: 'SKU-003',
    movement_type: 'Outbound',
    quantity: 25,
    from_location: 'WH-WEST-01',
    reference_number: 'ORD-2024-0002',
    movement_date: '2024-01-17T14:00:00Z',
    performed_by: 'Shipping Dept',
  },
  {
    movement_id: 'MOV-2024-0004',
    sku: 'SKU-001',
    movement_type: 'Adjustment',
    quantity: -5,
    from_location: 'WH-EAST-01',
    reference_number: 'ADJ-2024-001',
    movement_date: '2024-01-18T16:00:00Z',
    performed_by: 'Inventory Mgr',
    notes: 'Damaged items write-off',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getOrCreateSystemUser(): Promise<string> {
  let user = await prisma.user.findFirst({ where: { email: 'system@indoor-map.local' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'system@indoor-map.local',
        name: 'System',
        password: 'not-used',
        role: 'ADMIN',
      },
    });
  }
  return user.id;
}

async function createTable(tableData: (typeof TABLES)[0]) {
  console.log(`Creating table: ${tableData.displayName}...`);
  const existing = await prisma.customTable.findFirst({
    where: { name: tableData.name },
    include: { fields: true },
  });
  if (existing) {
    console.log(`  Table ${tableData.name} already exists, skipping...`);
    return existing;
  }
  const table = await createCustomTable(tableData as any, systemUserId);
  console.log(`  ✓ Created table: ${tableData.displayName}`);
  return table;
}

async function insertData(tableName: string, records: any[]) {
  console.log(`Inserting ${records.length} records into ${tableName}...`);
  let count = 0;
  for (const record of records) {
    try {
      await insertDataService(tableName, record);
      count++;
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log(`  Warning: ${e.message.substring(0, 80)}`);
      }
    }
  }
  console.log(`  ✓ Inserted ${count} records`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Professional Industry Tables Seed Script\n');
  console.log('='.repeat(60));

  try {
    systemUserId = await getOrCreateSystemUser();
    console.log(`Using user ID: ${systemUserId}\n`);

    for (const tableData of TABLES) {
      console.log(`\n📋 ${tableData.displayName}`);
      console.log('-'.repeat(40));
      await createTable(tableData);

      let sampleData: any[] = [];
      switch (tableData.name) {
        case 'customers':
          sampleData = CUSTOMERS_DATA;
          break;
        case 'orders':
          sampleData = ORDERS_DATA;
          break;
        case 'warehouses':
          sampleData = WAREHOUSES_DATA;
          break;
        case 'suppliers':
          sampleData = SUPPLIERS_DATA;
          break;
        case 'maintenance_records':
          sampleData = MAINTENANCE_DATA;
          break;
        case 'iot_devices':
          sampleData = IOT_DEVICES_DATA;
          break;
        case 'iot_alerts':
          sampleData = IOT_ALERTS_DATA;
          break;
        case 'stock_movements':
          sampleData = STOCK_MOVEMENTS_DATA;
          break;
      }
      if (sampleData.length > 0) await insertData(tableData.name, sampleData);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Professional tables seeded successfully!');
    console.log(`\n📊 Summary: ${TABLES.length} tables created with sample data`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
