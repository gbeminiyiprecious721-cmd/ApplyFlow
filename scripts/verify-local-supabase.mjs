import {
  localSupabaseConfig,
  verifyLocalSupabaseConfig,
} from "./local-supabase-config.mjs";

try {
  await verifyLocalSupabaseConfig(localSupabaseConfig());
  console.log("Existing ApplyFlow Supabase public config verified.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}