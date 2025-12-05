// Supabase client configuration
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// These should be set as environment variables in production
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database table names
export const TABLES = {
  ADMINS: 'admins',
  TEAM_MEMBERS: 'team_members',
  GRN_LOGS: 'grn_logs',
  GRN_DATA: 'grn_data'
};

