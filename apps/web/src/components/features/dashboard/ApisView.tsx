import { CustomTable, getCustomTables } from '@/api/customTables';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Check, Copy, Database, Info, Server, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ApisView() {
  const [tables, setTables] = useState<CustomTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    loadTables();
    const storedToken = localStorage.getItem('token');
    if (storedToken) setToken(storedToken);
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const data = await getCustomTables();
      setTables(data);
      if (data.length > 0 && !selectedTableId) {
        setSelectedTableId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const baseUrl = window.location.origin + '/api/custom-tables';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading API documentation...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Sidebar: Table List */}
      <Card className="w-64 flex flex-col h-full bg-card/50 backdrop-blur-sm border-white/10">
        <CardHeader className="p-4 border-b border-white/10">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            Tables
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => setSelectedTableId(table.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2',
                  selectedTableId === table.id
                    ? 'bg-primary/20 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                <Server className="h-4 w-4" />
                {table.displayName}
              </button>
            ))}
            {tables.length === 0 && (
              <p className="p-4 text-xs text-muted-foreground text-center">No tables found.</p>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Content: API Docs */}
      <Card className="flex-1 flex flex-col h-full bg-card/50 backdrop-blur-sm border-white/10 overflow-hidden">
        {selectedTable ? (
          <div className="flex flex-col h-full">
            <CardHeader className="p-6 border-b border-white/10 bg-white/5">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    {selectedTable.displayName} API
                    <Badge variant="outline" className="font-mono text-xs">
                      {selectedTable.name}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {selectedTable.description || 'Dynamic API endpoints for this table.'}
                  </CardDescription>
                </div>
                {token && (
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-md border border-white/10">
                    <span className="text-xs text-muted-foreground font-mono">Auth Token:</span>
                    <code className="text-xs text-green-400 font-mono">
                      {token.substring(0, 10)}...{token.substring(token.length - 5)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-1 hover:text-white"
                      onClick={() => copyToClipboard(token)}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-8 max-w-4xl">
                {/* Introduction */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-primary" />
                    Base Configuration
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    All API requests must include the Authorization header with a valid Bearer
                    token.
                  </p>
                  <div className="bg-black/40 p-4 rounded-md border border-white/10 font-mono text-sm">
                    <div className="text-muted-foreground"># Header</div>
                    <div className="text-blue-400">Authorization: Bearer &lt;YOUR_TOKEN&gt;</div>
                    <div className="mt-2 text-muted-foreground"># Base URL</div>
                    <div className="text-green-400">{baseUrl}</div>
                  </div>
                </div>

                {/* Endpoints */}
                <Tabs defaultValue="list" className="w-full">
                  <TabsList className="w-full justify-start border-b border-white/10 bg-transparent p-0 h-auto">
                    <TabsTrigger
                      value="list"
                      className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      List Records
                    </TabsTrigger>
                    <TabsTrigger
                      value="create"
                      className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      Create Record
                    </TabsTrigger>
                    <TabsTrigger
                      value="bulk"
                      className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      Bulk Create
                    </TabsTrigger>
                    <TabsTrigger
                      value="update"
                      className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      Update Record
                    </TabsTrigger>
                    <TabsTrigger
                      value="delete"
                      className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      Delete Record
                    </TabsTrigger>
                    <TabsTrigger
                      value="schema"
                      className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      Table Schema
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6">
                    {/* LIST */}
                    <TabsContent value="list" className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                          GET
                        </Badge>
                        <code className="text-sm bg-muted/50 px-2 py-1 rounded">
                          /{selectedTable.id}/records
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Retrieve a paginated list of records.
                      </p>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Query Parameters</h4>
                        <div className="grid grid-cols-3 gap-2 text-sm bg-muted/30 p-2 rounded">
                          <span className="font-mono text-blue-400">page</span>
                          <span>number</span>
                          <span className="text-muted-foreground">Page number (default: 1)</span>
                          <span className="font-mono text-blue-400">pageSize</span>
                          <span>number</span>
                          <span className="text-muted-foreground">
                            Items per page (default: 10)
                          </span>
                          <span className="font-mono text-blue-400">sortBy</span>
                          <span>string</span>
                          <span className="text-muted-foreground">Field to sort by</span>
                          <span className="font-mono text-blue-400">sortOrder</span>
                          <span>asc|desc</span>
                          <span className="text-muted-foreground">Sort direction</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">cURL Request</h4>
                        <pre className="bg-black/60 p-4 rounded-md overflow-x-auto text-xs font-mono text-gray-300 border border-white/10 whitespace-pre-wrap">
                          {generateCurlCommand(
                            'GET',
                            `${baseUrl}/${selectedTable.id}/records?page=1&pageSize=10`,
                            token
                          )}
                        </pre>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Example Response</h4>
                        <pre className="bg-black/60 p-4 rounded-md overflow-x-auto text-xs font-mono text-gray-300 border border-white/10">
                          {JSON.stringify(getDataExample(selectedTable), null, 2)}
                        </pre>
                      </div>
                    </TabsContent>

                    {/* CREATE */}
                    <TabsContent value="create" className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          POST
                        </Badge>
                        <code className="text-sm bg-muted/50 px-2 py-1 rounded">
                          /{selectedTable.id}/records
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Create a new record in the table.
                      </p>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">cURL Request</h4>
                        <pre className="bg-black/60 p-4 rounded-md overflow-x-auto text-xs font-mono text-gray-300 border border-white/10 whitespace-pre-wrap">
                          {generateCurlCommand(
                            'POST',
                            `${baseUrl}/${selectedTable.id}/records`,
                            token,
                            getExamplePayload(selectedTable)
                          )}
                        </pre>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Request Body</h4>
                        <pre className="bg-black/60 p-4 rounded-md overflow-x-auto text-xs font-mono text-gray-300 border border-white/10">
                          {JSON.stringify(getExamplePayload(selectedTable), null, 2)}
                        </pre>
                      </div>
                    </TabsContent>

                    {/* BULK */}
                    <TabsContent value="bulk" className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          POST
                        </Badge>
                        <code className="text-sm bg-muted/50 px-2 py-1 rounded">
                          /{selectedTable.id}/records/bulk
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Create multiple records in a single request.
                      </p>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">cURL Request</h4>
                        <pre className="bg-black/60 p-4 rounded-md overflow-x-auto text-xs font-mono text-gray-300 border border-white/10 whitespace-pre-wrap">
                          {generateCurlCommand(
                            'POST',
                            `${baseUrl}/${selectedTable.id}/records/bulk`,
                            token,
                            [getExamplePayload(selectedTable), getExamplePayload(selectedTable)]
                          )}
                        </pre>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Request Body</h4>
                        <p className="text-xs text-muted-foreground pb-2">
                          Array of record objects.
                        </p>
                        <pre className="bg-black/60 p-4 rounded-md overflow-x-auto text-xs font-mono text-gray-300 border border-white/10">
                          {JSON.stringify(
                            [getExamplePayload(selectedTable), getExamplePayload(selectedTable)],
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </TabsContent>

                    {/* UPDATE */}
                    <TabsContent value="update" className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
                          PUT
                        </Badge>
                        <code className="text-sm bg-muted/50 px-2 py-1 rounded">
                          /{selectedTable.id}/records/:recordId
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Update an existing record by ID.
                      </p>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">cURL Request</h4>
                        <pre className="bg-black/60 p-4 rounded-md overflow-x-auto text-xs font-mono text-gray-300 border border-white/10 whitespace-pre-wrap">
                          {generateCurlCommand(
                            'PUT',
                            `${baseUrl}/${selectedTable.id}/records/:recordId`,
                            token,
                            getExamplePayload(selectedTable)
                          )}
                        </pre>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Request Body</h4>
                        <p className="text-xs text-muted-foreground pb-2">
                          Partial updates are supported.
                        </p>
                        <pre className="bg-black/60 p-4 rounded-md overflow-x-auto text-xs font-mono text-gray-300 border border-white/10">
                          {JSON.stringify(getExamplePayload(selectedTable), null, 2)}
                        </pre>
                      </div>
                    </TabsContent>

                    {/* DELETE */}
                    <TabsContent value="delete" className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-red-500 hover:bg-red-600">
                          DELETE
                        </Badge>
                        <code className="text-sm bg-muted/50 px-2 py-1 rounded">
                          /{selectedTable.id}/records/:recordId
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground">Delete a record permanently.</p>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">cURL Request</h4>
                        <pre className="bg-black/60 p-4 rounded-md overflow-x-auto text-xs font-mono text-gray-300 border border-white/10 whitespace-pre-wrap">
                          {generateCurlCommand(
                            'DELETE',
                            `${baseUrl}/${selectedTable.id}/records/:recordId`,
                            token
                          )}
                        </pre>
                      </div>
                    </TabsContent>

                    {/* SCHEMA */}
                    <TabsContent value="schema" className="space-y-4">
                      <h4 className="text-sm font-medium">Field Definitions</h4>
                      <div className="border rounded-md divide-y">
                        {selectedTable.fields.map((field) => (
                          <div
                            key={field.id}
                            className="p-3 grid grid-cols-12 gap-2 text-sm hover:bg-muted/30"
                          >
                            <div className="col-span-3 font-medium font-mono">{field.name}</div>
                            <div className="col-span-2 text-muted-foreground flex items-center gap-2">
                              {field.dataType}
                              {DATA_TYPE_INFO[field.dataType] && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground/50 hover:text-foreground transition-colors cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      <div className="space-y-1">
                                        <p className="text-sm font-medium">
                                          {DATA_TYPE_INFO[field.dataType].description}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Example:{' '}
                                          <code className="bg-muted px-1 rounded text-foreground font-mono">
                                            {DATA_TYPE_INFO[field.dataType].example}
                                          </code>
                                        </p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <div className="col-span-7 flex flex-wrap gap-1">
                              {field.isRequired && (
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  Required
                                </Badge>
                              )}
                              {field.isUnique && (
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  Unique
                                </Badge>
                              )}
                              {field.validation?.options && (
                                <span className="text-xs text-muted-foreground">
                                  Options: {field.validation.options.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Terminal className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Select a Table</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Select a custom table from the sidebar to view its API documentation and endpoints.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

// Helpers for Generating Examples
function getExamplePayload(table: CustomTable) {
  const payload: Record<string, any> = {};
  table.fields.forEach((field) => {
    if (['id', 'createdAt', 'updatedAt'].includes(field.name)) return;

    switch (field.dataType) {
      case 'TEXT':
      case 'VARCHAR':
        payload[field.name] = 'string_value';
        break;
      case 'INTEGER':
      case 'BIGINT':
        payload[field.name] = 123;
        break;
      case 'DECIMAL':
      case 'FLOAT':
        payload[field.name] = 99.99;
        break;
      case 'BOOLEAN':
        payload[field.name] = true;
        break;
      case 'DATE':
        payload[field.name] = '2024-01-01';
        break;
      case 'TIMESTAMP':
      case 'TIMESTAMPTZ':
        payload[field.name] = new Date().toISOString();
        break;
      case 'JSONB':
        payload[field.name] = { key: 'value' };
        break;
      case 'IMAGE':
        payload[field.name] = 'https://example.com/image.jpg';
        break;
      case 'COLOR':
        payload[field.name] = '#FF5733';
        break;
      case 'SELECT':
        payload[field.name] = field.validation?.options?.[0] || 'OPTION_1';
        break;
      case 'RELATION':
        payload[field.name] = 'uuid-of-related-record';
        break;
      case 'GEOMETRY':
      case 'GEOMETRY_POINT':
        // case 'GEOMETRY_POLYGON':
        // case 'GEOMETRY_LINESTRING':
        // case 'GEOMETRY_MULTIPOINT':
        // case 'GEOMETRY_MULTIPOLYGON':
        payload[field.name] = { type: 'Point', coordinates: [0, 0] };
        break;
      default:
        payload[field.name] = null;
    }
  });
  return payload;
}

const DATA_TYPE_INFO: Record<string, { description: string; example: string }> = {
  TEXT: { description: 'Simple text string', example: '"Sample Text"' },
  VARCHAR: { description: 'Variable length text', example: '"Short text"' },
  INTEGER: { description: 'Whole number', example: '42' },
  BIGINT: { description: 'Large whole number', example: '9007199254740991' },
  DECIMAL: { description: 'Exact decimal number', example: '10.50' },
  FLOAT: { description: 'Floating point number', example: '3.14159' },
  BOOLEAN: { description: 'True or False', example: 'true' },
  DATE: { description: 'Calendar date (ISO 8601)', example: '"2024-03-20"' },
  TIMESTAMP: { description: 'Date and time', example: '"2024-03-20T14:30:00Z"' },
  TIMESTAMPTZ: {
    description: 'Date and time with timezone',
    example: '"2024-03-20T14:30:00+00:00"',
  },
  JSONB: { description: 'JSON object', example: '{"key": "value"}' },
  UUID: { description: 'Unique Identifier', example: '"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"' },
  IMAGE: { description: 'URL to an image file', example: '"https://example.com/photo.jpg"' },
  COLOR: { description: 'Hex color code', example: '"#000000"' },
  SELECT: { description: 'One of the defined options', example: '"OPTION_1"' },
  RELATION: { description: 'ID of the related record', example: '"uuid-of-record"' },
  IOT_SENSOR: { description: 'IoT Sensor Configuration', example: '{"sensorType": "temp"}' },
  GEOMETRY: {
    description: 'GeoJSON Geometry',
    example: '{"type": "Point", "coordinates": [0, 0]}',
  },
  GEOMETRY_POINT: {
    description: 'GeoJSON Point',
    example: '{"type": "Point", "coordinates": [0, 0]}',
  },
  GEOMETRY_POLYGON: {
    description: 'GeoJSON Polygon',
    example: '{"type": "Polygon", "coordinates": [[[0,0], [1,0], [1,1], [0,1], [0,0]]]}',
  },
  GEOMETRY_LINESTRING: {
    description: 'GeoJSON LineString',
    example: '{"type": "LineString", "coordinates": [[0,0], [1,1]]}',
  },
  GEOMETRY_MULTIPOINT: {
    description: 'GeoJSON MultiPoint',
    example: '{"type": "MultiPoint", "coordinates": [[0,0], [1,1]]}',
  },
  GEOMETRY_MULTIPOLYGON: {
    description: 'GeoJSON MultiPolygon',
    example: '{"type": "MultiPolygon", "coordinates": [[[[0,0], [1,0], [1,1], [0,0]]]]}',
  },
  TAGS: { description: 'Array of text tags', example: '["tag1", "tag2"]' },
};

function getDataExample(table: CustomTable) {
  return {
    data: [
      {
        id: 'record-uuid-1',
        ...getExamplePayload(table),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    meta: {
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    },
  };
}

function generateCurlCommand(
  method: string,
  url: string,
  token: string,
  data?: Record<string, any>
) {
  let command = `curl -X ${method} "${url}" \\
  -H "Authorization: Bearer ${token || '<YOUR_TOKEN>'}" \\
  -H "Content-Type: application/json"`;

  if (data) {
    command += ` \\
  -d '${JSON.stringify(data, null, 2)}'`;
  }

  return command;
}
