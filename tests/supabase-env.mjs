import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function load(file) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "module", "exports", source)(
    () => {
      throw Error("supabase-env has no imports");
    },
    module,
    module.exports,
  );
  return module.exports;
}

const env = load("src/lib/account/supabase-env.ts");
const names = [
  "NEXT_PUBLIC_MZ_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_MZ_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_MZ_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "MZ_SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MZ_POSTGRES_URL",
  "POSTGRES_URL",
];
const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));

function set(values) {
  for (const name of names) delete process.env[name];
  Object.assign(process.env, values);
}

try {
  set({
    NEXT_PUBLIC_SUPABASE_URL: "https://old.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "old-pub",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "old-anon",
    SUPABASE_SERVICE_ROLE_KEY: "old-role",
    POSTGRES_URL: "postgres://old",
  });
  assert.equal(env.supabasePublicUrl(), "https://old.supabase.co");
  assert.equal(env.supabasePublicKey(), "old-pub");
  assert.equal(env.supabaseServiceRoleKey(), "old-role");
  assert.equal(env.postgresUrl(), "postgres://old");

  set({
    NEXT_PUBLIC_SUPABASE_URL: "https://old.supabase.co",
    NEXT_PUBLIC_MZ_SUPABASE_URL: "https://new.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "old-pub",
    NEXT_PUBLIC_MZ_SUPABASE_PUBLISHABLE_KEY: "new-pub",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "old-anon",
    SUPABASE_SERVICE_ROLE_KEY: "old-role",
    MZ_SUPABASE_SERVICE_ROLE_KEY: "new-role",
    POSTGRES_URL: "postgres://old",
    MZ_POSTGRES_URL: "postgres://new",
  });
  assert.equal(env.supabasePublicUrl(), "https://new.supabase.co");
  assert.equal(env.supabasePublicKey(), "new-pub");
  assert.equal(env.supabaseServiceRoleKey(), "new-role");
  assert.equal(env.postgresUrl(), "postgres://new");

  set({
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "old-pub",
    NEXT_PUBLIC_MZ_SUPABASE_ANON_KEY: "new-anon",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "old-anon",
  });
  assert.equal(env.supabasePublicKey(), "old-pub");

  set({
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "old-anon",
    NEXT_PUBLIC_MZ_SUPABASE_ANON_KEY: "new-anon",
  });
  assert.equal(env.supabasePublicKey(), "new-anon");

  set({
    NEXT_PUBLIC_MZ_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_URL: "https://old.supabase.co",
    MZ_POSTGRES_URL: "",
    POSTGRES_URL: "postgres://old",
    MZ_SUPABASE_SERVICE_ROLE_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "old-role",
  });
  assert.equal(env.supabasePublicUrl(), "https://old.supabase.co");
  assert.equal(env.postgresUrl(), "postgres://old");
  assert.equal(env.supabaseServiceRoleKey(), "old-role");

  set({});
  assert.equal(env.supabasePublicUrl(), undefined);
  assert.equal(env.supabasePublicKey(), undefined);
  assert.equal(env.supabaseServiceRoleKey(), undefined);
  assert.equal(env.postgresUrl(), undefined);
} finally {
  for (const name of names) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
}

const helper = fs.readFileSync("src/lib/account/supabase-env.ts", "utf8");
for (const name of [
  "process.env.NEXT_PUBLIC_MZ_SUPABASE_URL",
  "process.env.NEXT_PUBLIC_SUPABASE_URL",
  "process.env.NEXT_PUBLIC_MZ_SUPABASE_PUBLISHABLE_KEY",
  "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "process.env.NEXT_PUBLIC_MZ_SUPABASE_ANON_KEY",
  "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "process.env.MZ_SUPABASE_SERVICE_ROLE_KEY",
  "process.env.SUPABASE_SERVICE_ROLE_KEY",
  "process.env.MZ_POSTGRES_URL",
  "process.env.POSTGRES_URL",
]) {
  assert.equal(helper.includes(name), true, name);
}
assert.equal(helper.includes("process.env["), false);

const direct = [
  "src/lib/account/auth.ts",
  "src/lib/account/db.ts",
  "src/lib/account/admin.ts",
  "src/lib/account/learning-access.ts",
  "src/proxy.ts",
];
for (const file of direct) {
  const source = fs.readFileSync(file, "utf8");
  assert.equal(source.includes("process.env.NEXT_PUBLIC_SUPABASE"), false, file);
  assert.equal(source.includes("process.env.SUPABASE_"), false, file);
  assert.equal(source.includes("process.env.POSTGRES_"), false, file);
  assert.equal(source.includes("supabase-env"), true, file);
}

const plans = fs.readFileSync("scripts/configure-pro-plans.mjs", "utf8");
assert.equal(plans.includes("supabase-env.ts"), true);
assert.equal(plans.includes("postgresUrl()"), true);
assert.equal(plans.includes("process.env.POSTGRES_URL"), false);

const report = fs.readFileSync("scripts/cloud-report.mjs", "utf8");
assert.equal(report.includes("process.env.MZ_MONETIZABLE_SUPABASE_URL||process.env.MONETIZABLE_SUPABASE_URL"), true);
assert.equal(report.includes("process.env.MZ_MONETIZABLE_SERVICE_ROLE_KEY||process.env.MONETIZABLE_SERVICE_ROLE_KEY"), true);

console.log("Passed Supabase MZ_ preference, empty-string fallback, and static NEXT_PUBLIC access.");
