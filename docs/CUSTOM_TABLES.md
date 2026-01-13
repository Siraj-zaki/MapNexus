# Custom Tables & PostGIS Integration

## Overview

The Indoor Map Platform includes a powerful dynamic schema builder that allows you to create custom tables with support for:

- **Standard SQL Types**: VARCHAR, INTEGER, DECIMAL, BOOLEAN, DATE, TIMESTAMP, UUID, TEXT, JSONB
- **PostGIS Spatial Types**: POINT, POLYGON, LINESTRING for geographic data
- **IoT Types**: Sensor data with configurable thresholds

## Quick Start

### 1. Start the Database

```bash
cd docker
docker compose up -d
```

This starts PostgreSQL with PostGIS 3.4, Redis, and MQTT broker.

### 2. Verify PostGIS

```bash
docker exec indoor-map-postgres psql -U indoor_map -d indoor_map -c "SELECT PostGIS_Version();"
```

Expected output: `3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1`

### 3. Seed Sample Data

```bash
cd apps/server
npx tsx scripts/seedProfessionalTables.ts
```

This creates 8 professional tables with sample data.

## Available Tables

| Category  | Table                 | Description                             |
| --------- | --------------------- | --------------------------------------- |
| Retail    | `customers`           | Customer database with loyalty tiers    |
| Retail    | `orders`              | Sales orders with payment details       |
| Inventory | `warehouses`          | Distribution centers with geo-locations |
| Inventory | `suppliers`           | Vendor management with ratings          |
| Inventory | `stock_movements`     | Inventory transfers and adjustments     |
| Assets    | `maintenance_records` | Equipment service history               |
| IoT       | `iot_devices`         | Connected device registry               |
| IoT       | `iot_alerts`          | Device alerts and notifications         |

Plus 6 original tables: products, store_locations, equipment, temperature_sensors, indoor_zones, beacons.

## API Endpoints

### Custom Tables Management

```
GET    /api/custom-tables              # List all tables
POST   /api/custom-tables              # Create table
GET    /api/custom-tables/:id          # Get table by ID or name
DELETE /api/custom-tables/:id          # Delete table
```

### Custom Data Operations

```
GET    /api/custom-data/:tableName           # Query data (with pagination)
POST   /api/custom-data/:tableName           # Insert record
GET    /api/custom-data/:tableName/:id       # Get record by ID
PUT    /api/custom-data/:tableName/:id       # Update record
DELETE /api/custom-data/:tableName/:id       # Soft delete record
GET    /api/custom-data/:tableName/geojson   # Export as GeoJSON
POST   /api/custom-data/:tableName/spatial   # Spatial query
GET    /api/custom-data/:tableName/:id/history  # Get record history
```

## Creating Tables with Geometry Fields

### Via API

```typescript
const tableDefinition = {
  name: 'my_locations',
  displayName: 'My Locations',
  description: 'Locations with coordinates',
  icon: '📍',
  fields: [
    { name: 'name', displayName: 'Name', dataType: 'VARCHAR', maxLength: 100, isRequired: true },
    {
      name: 'location',
      displayName: 'Location',
      dataType: 'GEOMETRY_POINT',
      srid: 4326,
      geometryType: 'POINT',
    },
  ],
};

await fetch('/api/custom-tables', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(tableDefinition),
});
```

### Inserting GeoJSON Data

```typescript
const record = {
  name: 'Central Park',
  location: {
    type: 'Point',
    coordinates: [-73.9654, 40.7829], // [longitude, latitude]
  },
};

await fetch('/api/custom-data/my_locations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(record),
});
```

## Frontend Components

### GeometryInput

Map-based input for Point, Polygon, and LineString geometry:

```tsx
import { GeometryInput } from '@/components/features/dashboard';

<GeometryInput value={currentGeometry} onChange={setGeometry} geometryType="Point" height={300} />;
```

### MapDataView

Display records with geometry on an interactive map:

```tsx
import { MapDataView } from '@/components/features/dashboard';

<MapDataView
  tableName="warehouses"
  records={warehouseData}
  geometryField="location"
  labelField="name"
  onRecordClick={(record) => console.log(record)}
/>;
```

### HistoryViewer

Timeline view of record changes:

```tsx
import { HistoryViewer } from '@/components/features/dashboard';

<HistoryViewer
  entries={historyEntries}
  currentData={currentRecord}
  onRestore={async (entry) => {
    /* restore logic */
  }}
/>;
```

### JsonEditor

JSON editing with validation and IoT templates:

```tsx
import { JsonEditor } from '@/components/features/dashboard';

<JsonEditor value={sensorConfig} onChange={setSensorConfig} height={200} />;
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://indoor_map:indoor_map_secret@localhost:5433/indoor_map"

# Mapbox (for geometry input/display)
VITE_MAPBOX_TOKEN="your_mapbox_token"
```

## Database Schema

Each custom table automatically includes:

- `id` (UUID) - Primary key
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp
- `deleted_at` (TIMESTAMPTZ) - Soft delete timestamp
- `created_by` (UUID) - User who created the record
- `updated_by` (UUID) - User who last updated

Plus a corresponding `_history` table with triggers for automatic change tracking.

## Spatial Indexes

GIST indexes are automatically created for all geometry columns:

```sql
CREATE INDEX idx_custom_<table>_<column>_gist
ON custom_<table> USING GIST (<column>);
```

## Troubleshooting

### PostGIS not found

```bash
docker exec indoor-map-postgres psql -U indoor_map -d indoor_map -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### Permission denied

Ensure the Docker container is running and accessible on port 5433.

### Geometry column not created

Check that `geometryType` and `srid` are specified for GEOMETRY\_ fields.
