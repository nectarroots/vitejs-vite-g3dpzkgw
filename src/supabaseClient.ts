import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wxfrqcmzwdmxrfrxyupp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4ZnJxY216d2RteHJmcnh5dXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzY2MzMsImV4cCI6MjEwMDMxMjYzM30.bPufX5GoDQ2X2Q7e5raRo7nsVqP4edteNxSF8AVeJOU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);