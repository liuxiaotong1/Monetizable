import "server-only";
import { Pool } from "pg";
import { supabaseCa } from "./ca";
let pool: Pool | undefined;
export function database() {
  if (!process.env.POSTGRES_URL) throw Error("Account storage unavailable");
  const url = new URL(process.env.POSTGRES_URL);
  url.searchParams.delete("sslmode");
  return (pool ||= new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true, ca: supabaseCa },
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 20000,
  }));
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const result = await database().query(
    "INSERT INTO quest_rate_limits(key,window_start,count) VALUES($1,now(),1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN quest_rate_limits.window_start<now()-$2*interval'1 second' THEN 1 ELSE quest_rate_limits.count+1 END,window_start=CASE WHEN quest_rate_limits.window_start<now()-$2*interval'1 second' THEN now() ELSE quest_rate_limits.window_start END RETURNING count",
    [key, seconds],
  );
  return Number(result.rows[0].count) <= limit;
}
export async function profile(userId: string) {
  const { rows } = await database().query(
    "INSERT INTO quest_profiles(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET last_seen_at=now() RETURNING record,revision,tutorial_done,joined_at",
    [userId],
  );
  return rows[0];
}
