#!/usr/bin/env node
/* Insighta Labs+ CLI — TRD Stage 3 */
const fs = require("fs");
const path = require("path");
const { Command } = require("commander");
const ora = require("ora");
const Table = require("cli-table3");
const { getApiUrl } = require("./lib/config");
const { readCredentials, clearCredentials, writeCredentials } = require("./lib/store");
const { apiJson, ensureFreshCredentials } = require("./lib/api");
const { buildListQuery } = require("./lib/query");
const { runLogin } = require("./lib/login");

const program = new Command();

program.name("insighta").description("Insighta Labs+ command-line interface").version("0.1.0");

program
  .command("login")
  .description("Authenticate with GitHub (PKCE); stores ~/.insighta/credentials.json")
  .action(async () => {
    const spinner = ora();
    try {
      await runLogin(spinner);
    } catch (e) {
      spinner.fail(e.message || String(e));
      process.exitCode = 1;
    }
  });

program
  .command("logout")
  .description("Revoke refresh token on the server and remove local credentials")
  .action(async () => {
    const creds = readCredentials();
    if (!creds?.refresh_token) {
      clearCredentials();
      console.log("Already logged out.");
      return;
    }
    const spinner = ora("Logging out…").start();
    try {
      await fetch(`${getApiUrl()}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: creds.refresh_token })
      });
      clearCredentials();
      spinner.succeed("Logged out.");
    } catch (e) {
      spinner.fail(e.message || String(e));
      clearCredentials();
      process.exitCode = 1;
    }
  });

program
  .command("whoami")
  .description("Show the current authenticated user")
  .action(async () => {
    const spinner = ora().start();
    try {
      const data = await apiJson("/api/me", { method: "GET" });
      spinner.stop();
      const u = data.data;
      console.log(`@${u.username} (${u.role})`);
    } catch (e) {
      spinner.fail(e.message || String(e));
      process.exitCode = 1;
    }
  });

const listOpts = (cmd) =>
  cmd
    .option("--gender <g>")
    .option("--country <code>")
    .option("--age-group <group>")
    .option("--min-age <n>")
    .option("--max-age <n>")
    .option("--min-gender-probability <p>")
    .option("--min-country-probability <p>")
    .option("--sort-by <field>")
    .option("--order <asc|desc>")
    .option("--page <n>")
    .option("--limit <n>");

const profiles = program.command("profiles").description("Profile operations");

// Shared list/export filter flags so command behavior stays consistent.
listOpts(profiles.command("list"))
  .description("List profiles with optional filters (same query params as API)")
  .action(async (opts) => {
    const spinner = ora("Fetching profiles…").start();
    try {
      const qs = buildListQuery(opts);
      const data = await apiJson(`/api/profiles${qs}`, { method: "GET" });
      spinner.stop();
      const table = new Table({
        head: ["id", "name", "gender", "age", "country", "created_at"],
        wordWrap: true
      });
      for (const row of data.data || []) {
        table.push([
          row.id,
          row.name,
          row.gender,
          row.age,
          row.country_id,
          row.created_at
        ]);
      }
      console.log(table.toString());
      console.log(
        `Page ${data.page}/${data.total_pages || "?"} — total records: ${data.total}`
      );
    } catch (e) {
      spinner.fail(e.message || String(e));
      process.exitCode = 1;
    }
  });

profiles
  .command("get <id>")
  .description("Get one profile by UUID")
  .action(async (id) => {
    const spinner = ora("Fetching profile…").start();
    try {
      const data = await apiJson(`/api/profiles/${encodeURIComponent(id)}`, {
        method: "GET"
      });
      spinner.stop();
      console.log(JSON.stringify(data.data, null, 2));
    } catch (e) {
      spinner.fail(e.message || String(e));
      process.exitCode = 1;
    }
  });

profiles
  .command("search")
  .description(
    "Natural language search (multi-word query without quotes is supported — tokens are joined with spaces)"
  )
  .argument("<query...>", "Natural language query, e.g. young males from nigeria")
  .option("--page <n>")
  .option("--limit <n>")
  .action(async (queryParts, opts) => {
    const q = Array.isArray(queryParts) ? queryParts.join(" ").trim() : String(queryParts ?? "").trim();
    if (!q) {
      console.error("Missing search query.");
      process.exitCode = 1;
      return;
    }
    const spinner = ora("Searching…").start();
    try {
      const p = new URLSearchParams();
      p.set("q", q);
      if (opts.page != null) p.set("page", String(opts.page));
      if (opts.limit != null) p.set("limit", String(opts.limit));
      const data = await apiJson(`/api/profiles/search?${p.toString()}`, {
        method: "GET"
      });
      spinner.stop();
      const table = new Table({
        head: ["id", "name", "gender", "age", "country"],
        wordWrap: true
      });
      for (const row of data.data || []) {
        table.push([row.id, row.name, row.gender, row.age, row.country_id]);
      }
      console.log(table.toString());
      console.log(`Total: ${data.total}`);
    } catch (e) {
      spinner.fail(e.message || String(e));
      process.exitCode = 1;
    }
  });

profiles
  .command("create")
  .requiredOption("--name <name>")
  .description("Create a profile (admin only)")
  .action(async (opts) => {
    const spinner = ora("Creating profile…").start();
    try {
      const data = await apiJson("/api/profiles", {
        method: "POST",
        body: JSON.stringify({ name: opts.name })
      });
      spinner.succeed("Created.");
      console.log(JSON.stringify(data.data, null, 2));
    } catch (e) {
      spinner.fail(e.message || String(e));
      process.exitCode = 1;
    }
  });

listOpts(
  profiles
    .command("export")
    .requiredOption("--format <fmt>", "csv only", "csv")
    .description("Export CSV to the current working directory (admin only)")
).action(async (opts) => {
    if (opts.format !== "csv") {
      console.error("Only --format csv is supported.");
      process.exitCode = 1;
      return;
    }
    const spinner = ora("Downloading export…").start();
    try {
      const qs = new URLSearchParams();
      qs.set("format", "csv");
      const listPart = buildListQuery(opts);
      if (listPart) {
        new URLSearchParams(listPart.replace(/^\?/, "")).forEach((v, k) => {
          qs.set(k, v);
        });
      }
      const creds = await ensureFreshCredentials();
      const url = `${getApiUrl()}/api/profiles/export?${qs.toString()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "X-API-Version": "1"
        }
      });
      if (!res.ok) {
        const t = await res.text();
        let msg = t;
        try {
          msg = JSON.parse(t).message || t;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const filename = `profiles_${Date.now()}.csv`;
      const dest = path.join(process.cwd(), filename);
      fs.writeFileSync(dest, buf);
      spinner.succeed(`Saved ${dest}`);
    } catch (e) {
      spinner.fail(e.message || String(e));
      process.exitCode = 1;
    }
  });

program.parse();
