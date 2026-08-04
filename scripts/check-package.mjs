import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputFlag = process.argv.indexOf("--output");
const persistentOutput =
  outputFlag === -1 ? undefined : resolve(root, process.argv[outputFlag + 1]);
const scratch = await mkdtemp(join(tmpdir(), "iso-room-schema-pack-"));
const artifactDir = persistentOutput ?? join(scratch, "artifacts");
const consumerDir = join(scratch, "consumer");

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

try {
  await mkdir(artifactDir, { recursive: true });
  await mkdir(consumerDir, { recursive: true });

  run("pnpm", ["build"]);
  run("pnpm", ["pack", "--pack-destination", artifactDir]);

  const tarballName = (await readdir(artifactDir)).find((name) =>
    name.endsWith(".tgz"),
  );
  if (!tarballName) throw new Error("pnpm pack did not create a tarball");
  const tarball = join(artifactDir, tarballName);

  const listing = spawnSync("tar", ["-tzf", tarball], {
    encoding: "utf8",
  });
  if (listing.status !== 0) throw new Error("unable to inspect package tarball");
  const packedFiles = new Set(listing.stdout.trim().split("\n"));
  for (const required of [
    "package/package.json",
    "package/README.md",
    "package/LICENSE",
    "package/dist/index.js",
    "package/dist/index.d.ts",
    "package/schema/layout-v1.schema.json",
    "package/fixtures/valid/basic-room.json",
  ]) {
    if (!packedFiles.has(required)) {
      throw new Error(`package tarball is missing ${required}`);
    }
  }

  await writeFile(
    join(consumerDir, "package.json"),
    JSON.stringify(
      {
        private: true,
        type: "module",
        dependencies: {
          "iso-room-schema": `file:${tarball}`,
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(consumerDir, "smoke.mjs"),
    `import { readFile } from "node:fs/promises";
import { parseLayout, SCHEMA_VERSION } from "iso-room-schema";

const schemaUrl = import.meta.resolve("iso-room-schema/schema");
const schema = JSON.parse(await readFile(new URL(schemaUrl), "utf8"));
const fixtureUrl = import.meta.resolve(
  "iso-room-schema/fixtures/valid/basic-room.json",
);
const fixture = JSON.parse(await readFile(new URL(fixtureUrl), "utf8"));
if (SCHEMA_VERSION !== "1.0.0") throw new Error("unexpected schema version");
if (schema.$id !== "https://iso-room.dev/schema/layout-v1.schema.json") {
  throw new Error("schema export did not resolve");
}
const result = parseLayout(fixture);
if (!result.success) throw new Error("runtime import failed validation");
`,
  );
  await writeFile(
    join(consumerDir, "smoke.ts"),
    `import { parseLayout, type LayoutDocument } from "iso-room-schema";
const document = {} as LayoutDocument;
parseLayout(document);
`,
  );

  run("pnpm", ["install", "--ignore-scripts"], consumerDir);
  run("node", ["smoke.mjs"], consumerDir);
  run(
    "pnpm",
    [
      "exec",
      "tsc",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--target",
      "ES2022",
      "--strict",
      "--noEmit",
      join(consumerDir, "smoke.ts"),
    ],
    root,
  );

  const manifest = JSON.parse(
    await readFile(join(root, "package.json"), "utf8"),
  );
  console.log(`validated ${manifest.name}@${manifest.version}: ${tarball}`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
