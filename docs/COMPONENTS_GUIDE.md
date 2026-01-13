# Dynamic Data Components Guide

## Overview

The Dynamic Data components provide a complete UI toolkit for working with custom tables, geometry data, and IoT configurations.

## Cell Renderers

Import from `@/components/features/dashboard`:

### TextCell

```tsx
<TextCell value="Hello World" maxLength={30} />
```

### NumberCell

```tsx
<NumberCell value={42.5} prefix="$" suffix=" USD" decimals={2} />
```

### CurrencyCell

```tsx
<CurrencyCell value={1234.56} currency="$" />
```

### BooleanCell

```tsx
<BooleanCell value={true} trueLabel="Active" falseLabel="Inactive" />
```

### DateCell

```tsx
<DateCell value="2024-01-15" format="relative" />
// Options: 'date' | 'datetime' | 'time' | 'relative'
```

### TagsCell

```tsx
<TagsCell value={['urgent', 'review', 'approved']} maxTags={3} />
```

### StatusCell

```tsx
<StatusCell value="Active" />
// Auto-colors: active, pending, completed, error, warning, online, offline, etc.
```

### GeometryCell

```tsx
<GeometryCell value={{ type: 'Point', coordinates: [-73.98, 40.74] }} onClick={() => openMap()} />
```

### UuidCell

```tsx
<UuidCell value="550e8400-e29b-41d4-a716-446655440000" showCopy />
```

---

## GeometryInput

Map-based geometry input with Mapbox GL.

### Props

| Prop          | Type                                 | Default         | Description            |
| ------------- | ------------------------------------ | --------------- | ---------------------- |
| value         | GeoJSONGeometry                      | null            | Current geometry value |
| onChange      | (geometry) => void                   | required        | Change handler         |
| geometryType  | 'Point' \| 'Polygon' \| 'LineString' | required        | Type of geometry       |
| height        | number                               | 300             | Map height in pixels   |
| defaultCenter | [lng, lat]                           | [-73.98, 40.74] | Initial map center     |
| disabled      | boolean                              | false           | Disable input          |

### Features

- **Point**: Click to place marker, or enter lat/lng manually
- **Polygon**: Draw with click, double-click to finish
- **LineString**: Draw path points, double-click to finish
- **Locate**: Use browser geolocation
- **Copy**: Copy GeoJSON to clipboard

### Example

```tsx
import { GeometryInput } from '@/components/features/dashboard';

function LocationPicker() {
  const [geometry, setGeometry] = useState(null);

  return (
    <GeometryInput
      value={geometry}
      onChange={setGeometry}
      geometryType="Point"
      height={400}
      defaultCenter={[-122.4194, 37.7749]} // San Francisco
    />
  );
}
```

---

## MapDataView

Interactive map displaying records with geometry.

### Props

| Prop          | Type             | Description               |
| ------------- | ---------------- | ------------------------- |
| tableName     | string           | Name of the table         |
| records       | array            | Records to display        |
| geometryField | string           | Field containing geometry |
| labelField    | string           | Field to use for labels   |
| onRecordClick | (record) => void | Click handler             |
| height        | number           | Map height                |

### Features

- Auto-fits bounds to data
- Layer toggles (Points, Polygons, Lines)
- Search sidebar
- Click to select and fly to record
- Popup with record details

### Example

```tsx
import { MapDataView } from '@/components/features/dashboard';

function WarehouseMap({ warehouses }) {
  return (
    <MapDataView
      tableName="warehouses"
      records={warehouses}
      geometryField="location"
      labelField="name"
      onRecordClick={(record) => {
        console.log('Selected:', record);
      }}
      height={600}
    />
  );
}
```

---

## HistoryViewer

Timeline view of record changes with diff and restore.

### Props

| Prop        | Type               | Description          |
| ----------- | ------------------ | -------------------- |
| entries     | HistoryEntry[]     | History entries      |
| currentData | object             | Current record state |
| onRestore   | (entry) => Promise | Restore handler      |
| isLoading   | boolean            | Loading state        |

### HistoryEntry Type

```typescript
interface HistoryEntry {
  id: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  previousData: object | null;
  changedFields?: string[];
  performedBy?: string;
  performedAt: string;
}
```

### Example

```tsx
import { HistoryViewer } from '@/components/features/dashboard';

function RecordHistory({ recordId }) {
  const { data: history } = useRecordHistory(recordId);
  const { data: current } = useRecord(recordId);

  return (
    <HistoryViewer
      entries={history}
      currentData={current}
      onRestore={async (entry) => {
        await api.restoreRecord(recordId, entry.previousData);
      }}
    />
  );
}
```

---

## JsonEditor

JSON editing with validation and templates.

### Props

| Prop      | Type            | Default       | Description      |
| --------- | --------------- | ------------- | ---------------- |
| value     | object          | null          | JSON value       |
| onChange  | (value) => void | required      | Change handler   |
| height    | number          | 200           | Editor height    |
| templates | JsonTemplate[]  | IoT templates | Template presets |

### Features

- Real-time syntax validation
- Error messages with line numbers
- Format/prettify button
- IoT sensor templates
- Copy/paste support

### Built-in IoT Templates

- Temperature Sensor
- Humidity Sensor
- Motion Sensor
- Door Sensor
- Device Config

### Example

```tsx
import { JsonEditor } from '@/components/features/dashboard';

function SensorConfig() {
  const [config, setConfig] = useState({
    interval: 60,
    threshold_max: 100,
  });

  return <JsonEditor value={config} onChange={setConfig} height={250} />;
}
```

---

## Importing Components

All components can be imported from the dashboard index:

```tsx
import {
  // Cell Renderers
  TextCell,
  NumberCell,
  CurrencyCell,
  BooleanCell,
  DateCell,
  GeometryCell,
  JsonCell,
  TagsCell,
  FileCell,
  StatusCell,
  UuidCell,

  // Views
  DynamicTableView,
  MapDataView,

  // Inputs
  GeometryInput,
  JsonEditor,
  DynamicDataForm,

  // History
  HistoryViewer,
} from '@/components/features/dashboard';
```
