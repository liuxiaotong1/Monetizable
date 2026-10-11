const fs = require('node:fs');
const assert = require('node:assert/strict');
process.loadEnvFile('.env.production.local');
const { Client } = require(process.env.PG_TEST_MODULE);
async function main() {
  const ca = await (await fetch('https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt')).text();
  const url = new URL(process.env.POSTGRES_URL_NON_POOLING); url.searchParams.delete('sslmode');
  const db = new Client({connectionString:url.toString(),ssl:{ca,rejectUnauthorized:true}});
  await db.connect();
  try {
    await db.query('begin');
    const version='20260913210000';
    if (!(await db.query('select 1 from supabase_migrations.schema_migrations where version=$1',[version])).rowCount) {
      const sql=fs.readFileSync(`supabase/migrations/${version}_admin_entitlements.sql`,'utf8');
      await db.query(sql);
      await db.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',[version,'admin_entitlements',[sql]]);
    }
    await db.query('savepoint checks');
    const admin=crypto.randomUUID(),regular=crypto.randomUUID();
    await db.query(`insert into auth.users(id,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values($1,now(),'{"app_role":"admin"}','{}'),($2,now(),'{}','{"app_role":"admin"}')`,[admin,regular]);
    for (const [id,expected] of [[admin,true],[regular,false]]) {
      assert.equal((await db.query('select account_is_admin($1) as ok',[id])).rows[0].ok,expected);
      for(let i=0;i<3;i++) {
        assert.equal((await db.query('select consume_application_click($1,$2,$3) as r',[id,crypto.randomUUID(),crypto.randomUUID()])).rows[0].r,expected||i<2?'allowed':'payment_required');
        const scan=crypto.randomUUID();
        assert.equal((await db.query('select reserve_analysis($1,$2) as r',[id,scan])).rows[0].r,expected||i<2?'reserved':'payment_required');
        await db.query("update account_usage_events set status='complete' where id=$1",[scan]);
      }
    }
    assert.equal((await db.query("select has_function_privilege('authenticated','public.account_is_admin(uuid)','EXECUTE') as ok")).rows[0].ok,false);
    await db.query('rollback to savepoint checks');
    if(process.argv.includes('--apply')) {
      // Explicitly authorized account only; UUID and confirmed email must both match.
      const granted=await db.query(`update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||'{"app_role":"admin"}'::jsonb,updated_at=now() where id=$1 and lower(email)=$2 and email_confirmed_at is not null returning id`,['672fb72a-99e3-4ff3-8d3d-c80757df49ab','liuxiaotong268@gmail.com']);
      assert.equal(granted.rowCount,1);
      assert.equal((await db.query('select account_is_admin($1) as ok,account_has_subscription($1) as entitled',[granted.rows[0].id])).rows[0].entitled,true);
      await db.query('commit');
    } else await db.query('rollback');
    console.log('PASS: admin entitlement, regular-user quota, metadata spoof rejection, restricted RPC; test records rolled back. '+(process.argv.includes('--apply')?'Requested account granted admin.':'Dry run only.'));
  } catch(e) { await db.query('rollback');throw e; } finally {await db.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
