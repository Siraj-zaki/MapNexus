-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create extensions for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE indoor_map TO indoor_map;
GRANT ALL PRIVILEGES ON SCHEMA public TO indoor_map;

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'Database initialized successfully with PostGIS extensions';
END $$;
