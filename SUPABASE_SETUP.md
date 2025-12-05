# Supabase Database Setup

This document describes the database schema required for the GRN Generator application.

## Prerequisites

1. Create a Supabase project at https://supabase.com
2. Get your Supabase URL and anon key from Project Settings > API
3. Add them to your environment variables (create `.env` file):

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Tables

### 1. `admins` Table

Stores admin user credentials.

```sql
CREATE TABLE admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_admins_username ON admins(username);
```

### 2. `team_members` Table

Stores warehouse team members for dropdowns.

```sql
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('warehouseNos', 'qcPersons', 'supervisors', 'warehouseManagers')),
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, value)
);

-- Create index for faster lookups
CREATE INDEX idx_team_members_category ON team_members(category);
```

### 3. `grn_logs` Table

Stores GRN log metadata and summary information.

```sql
CREATE TABLE grn_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_number TEXT NOT NULL,
  brand_name TEXT,
  replenishment_number TEXT,
  warehouse_no TEXT,
  inward_date DATE,
  po_number TEXT,
  created_by TEXT NOT NULL,
  item_count INTEGER DEFAULT 0,
  total_ordered_units INTEGER DEFAULT 0,
  total_received_units INTEGER DEFAULT 0,
  total_shortage_units INTEGER DEFAULT 0,
  total_excess_units INTEGER DEFAULT 0,
  total_not_ordered_units INTEGER DEFAULT 0,
  total_qc_passed_units INTEGER DEFAULT 0,
  total_qc_failed_units INTEGER DEFAULT 0,
  receipt_accuracy INTEGER DEFAULT 0,
  qc_pass_rate INTEGER DEFAULT 0,
  qc_performed BOOLEAN DEFAULT false,
  acknowledge_only BOOLEAN DEFAULT false,
  grn_header_info JSONB,
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_grn_logs_created_at ON grn_logs(created_at DESC);
CREATE INDEX idx_grn_logs_created_by ON grn_logs(created_by);
CREATE INDEX idx_grn_logs_document_number ON grn_logs(document_number);
```

### 4. `grn_data` Table

Stores full GRN data for each log.

```sql
CREATE TABLE grn_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grn_log_id UUID NOT NULL REFERENCES grn_logs(id) ON DELETE CASCADE,
  grn_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_grn_data_log_id ON grn_data(grn_log_id);
```

## Row Level Security (RLS)

For production, you should set up Row Level Security policies. Here are example policies:

### Admins Table
```sql
-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users (adjust based on your auth setup)
CREATE POLICY "Admins are viewable by authenticated users" ON admins
  FOR SELECT USING (true);

-- Allow insert for service role only (or specific admin users)
CREATE POLICY "Admins are insertable by service role" ON admins
  FOR INSERT WITH CHECK (true);

-- Allow update for password changes (required for changeAdminPassword function)
CREATE POLICY "Admins can update their own password" ON admins
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Allow delete for service role only (optional, for admin management)
CREATE POLICY "Admins are deletable by service role" ON admins
  FOR DELETE USING (true);
```

### Team Members Table
```sql
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Team members are accessible by authenticated users" ON team_members
  FOR ALL USING (true);
```

### GRN Logs Table
```sql
ALTER TABLE grn_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "GRN logs are accessible by authenticated users" ON grn_logs
  FOR ALL USING (true);
```

### GRN Data Table
```sql
ALTER TABLE grn_data ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "GRN data is accessible by authenticated users" ON grn_data
  FOR ALL USING (true);
```

## Initial Data

After creating the tables, you can insert the default admin user:

```sql
INSERT INTO admins (username, password_hash) 
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');
-- Password: admin123 (SHA-256 hash)
```

## Notes

- The application will automatically create the default admin user if it doesn't exist
- All timestamps are stored in UTC
- JSONB columns store flexible JSON data
- Foreign key constraint ensures GRN data is deleted when logs are deleted (CASCADE)