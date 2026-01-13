#!/usr/bin/env node

/**
 * Publish script: test -> build -> bump -> publish -> tag -> push
 *
 * Usage:
 *   node scripts/publish.js patch
 *   node scripts/publish.js minor
 *   node scripts/publish.js major
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "..", "package.json");

function exec(command, options = {}) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { stdio: "inherit", ...options });
  } catch (error) {
    console.error(`\n❌ Failed: ${command}`);
    process.exit(1);
  }
}

function getVersion() {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  return pkg.version;
}

function bumpVersion(type) {
  const validTypes = ["patch", "minor", "major"];
  if (!validTypes.includes(type)) {
    console.error(
      `❌ Invalid version type: ${type}. Must be one of: ${validTypes.join(
        ", "
      )}`
    );
    process.exit(1);
  }

  console.log(`\n📦 Bumping ${type} version...`);
  exec(`npm version ${type} --no-git-tag-version`);
  return getVersion();
}

function main() {
  const versionType = process.argv[2];

  if (!versionType) {
    console.error("❌ Usage: node scripts/publish.js <patch|minor|major>");
    process.exit(1);
  }

  console.log("🚀 Starting publish workflow...\n");

  // Step 1: Test
  console.log("1️⃣  Running tests...");
  exec("npm test");

  // Step 2: Build
  console.log("\n2️⃣  Building...");
  exec("npm run build");

  // Step 3: Bump version
  const newVersion = bumpVersion(versionType);
  console.log(`✅ Version bumped to ${newVersion}`);

  // Step 4: Publish to npm
  console.log("\n3️⃣  Publishing to npm...");
  exec("npm publish");

  // Step 5: Git commit and tag
  console.log("\n4️⃣  Creating git commit and tag...");
  exec("git add package.json");
  exec(`git commit -m "chore: bump version to ${newVersion}"`);
  exec(`git tag v${newVersion}`);

  // Step 6: Push to git
  console.log("\n5️⃣  Pushing to git...");
  exec("git push");
  exec("git push --tags");

  console.log(`\n✅ Successfully published rexfect@${newVersion}!\n`);
}

main();
