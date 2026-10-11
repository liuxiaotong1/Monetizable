const fs = require('node:fs');
const assert = require('node:assert/strict');
process.loadEnvFile('.env.production.local');
const { Client } = require(process.env.PG_TEST_MODULE);
async function main() {
  const ca = await fetch('https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt');
  assert.ok(ca.ok);
  const url = new URL(process.env.POSTGRES_URL_NON_POOLING); url.searchParams.delete('sslmode');
  const db = new Client({ connectionString: url.toString(), ssl: { ca: await ca.text(), rejectUnauthorized: true }, connectionTimeoutMillis: 10000 });
  await db.connect();
  try {
    await db.query('begin');
    const version = '20260913150000';
    const sql = fs.readFileSync(`supabase/migrations/${version}_application_clicks.sql`, 'utf8');
    if (process.argv.includes('--apply')) {
      const applied = await db.query('select 1 from supabase_migrations.schema_migrations where version=$1', [version]);
      if (!applied.rowCount) {
        await db.query(sql);
        await db.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)', [version, 'application_clicks', [sql]]);
      }
    }
    await db.query('savepoint test_only');
    const user = crypto.randomUUID(), other = crypto.randomUUID(), match = crypto.randomUUID();
    await db.query('insert into auth.users(id) values($1),($2)', [user, other]);
    const click = async (owner, id=crypto.randomUUID(), target=match) => (await db.query('select consume_application_click($1,$2,$3) as result', [owner,id,target])).rows[0].result;
    const first = crypto.randomUUID();
    assert.equal(await click(user,first),'allowed');
    assert.equal(await click(user,first),'allowed','A network retry consumes no extra allowance');
    assert.equal(await click(user),'allowed','Second click is free, even on the same opportunity');
    assert.equal(await click(user),'payment_required','Third click requires subscription');
    assert.equal(await click(other,first),'forbidden');
    assert.equal(await click(other),'allowed','Accounts have independent allowances');
    assert.equal(Number((await db.query('select count(*) from account_application_clicks where user_id=$1',[user])).rows[0].count),2);
    // Uncommitted stub only visible inside this rollback-isolated test transaction.
    await db.query('create or replace function public.account_has_subscription(p_user uuid) returns boolean language sql stable security definer set search_path=public as $$ select true $$');
    assert.equal(await click(user),'allowed','Subscribers can open further applications');
    const permissions = (await db.query("select has_function_privilege('authenticated','public.consume_application_click(uuid,uuid,uuid)','EXECUTE') as rpc, has_table_privilege('authenticated','public.account_application_clicks','INSERT') as direct")).rows[0];
    assert.equal(permissions.rpc,false); assert.equal(permissions.direct,false);
    await db.query('rollback to savepoint test_only');
    await db.query(process.argv.includes('--apply') ? 'commit' : 'rollback');
    console.log('PASS: first two allowed, third gated, retry idempotency, account isolation, subscribers, restricted permissions; test data rolled back.');
  } catch (e) { await db.query('rollback'); throw e; }
  finally { await db.end(); }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
