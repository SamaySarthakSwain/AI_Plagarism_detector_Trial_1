import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Export null when Supabase isn't configured — all consumers handle this gracefully
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = !!supabase;

export type ScanRecord = {
  id: string;
  created_at: string;
  file_name: string;
  ai_score: number;
  plagiarism_score: number;
  integrity_score: number;
  human_score: number;
  tool: string;
  language?: string;
};

export type SharedReportRecord = {
  id: string;
  uuid: string;
  created_at: string;
  expires_at: string;
  file_name: string;
  scores: {
    aiScore: number;
    plagiarism: number;
    integrity: number;
    human: number;
    unique: number;
  };
  highlights: Array<{ text: string; verdict: string; confidence: number }>;
  tool: string;
  reasons: string[];
};
