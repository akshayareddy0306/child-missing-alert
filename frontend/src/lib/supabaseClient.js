// Supabase initialization — this is the connection point to your "backend"
import { createClient } from "@supabase/supabase-js";

// TODO: paste your own project URL and anon key from
// Supabase Dashboard → Project Settings → API
const supabaseUrl = "https://hwwykqipesnrypjtnszz.supabase.co";
const supabaseAnonKey = "sb_publishable_5ZjL0Yqx86qAoHIvWh2KQQ_MosOJy41";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
