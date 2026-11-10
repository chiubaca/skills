#!/usr/bin/env node
import { existsSync } from "node:fs";
import { copyFile, mkdir, stat } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".avif",
]);

const NOTES_DIR = process.env.NOTES_DIR
  ? resolve(process.env.NOTES_DIR)
  : resolve("/home/chiubaca/Projects/notes");
const ATTACHMENTS_DIR = join(NOTES_DIR, "attachments");

function printUsage() {
  console.error("Usage: attach-image.mjs <source-path> [alt-text] [--commit]");
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  let commit = false;
  for (const arg of argv) {
    if (arg === "--commit") {
      commit = true;
    } else {
      positional.push(arg);
    }
  }
  return { sourcePath: positional[0], altText: positional[1], commit };
}

async function isImageByMagic(filePath) {
  // Prefer `file` command when available; fall back to extension check.
  const fileCmd = spawnSync("file", ["--brief", "--mime-type", filePath], {
    encoding: "utf8",
  });
  if (fileCmd.status === 0) {
    const mime = fileCmd.stdout.trim();
    return mime.startsWith("image/");
  }
  return null;
}

function sanitizeFilename(name) {
  const base = name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
  return base || "image";
}

async function main() {
  const { sourcePath: sourcePathRaw, altText = "image", commit } = parseArgs(
    process.argv.slice(2),
  );

  if (!sourcePathRaw) printUsage();

  const sourcePath = resolve(sourcePathRaw);
  if (!existsSync(sourcePath)) {
    console.error(`File not found: ${sourcePath}`);
    process.exit(1);
  }

  const sourceStat = await stat(sourcePath);
  if (!sourceStat.isFile()) {
    console.error(`Not a file: ${sourcePath}`);
    process.exit(1);
  }

  const ext = extname(sourcePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    console.error(
      `Unsupported file type "${ext}". Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
    );
    process.exit(1);
  }

  const magicCheck = await isImageByMagic(sourcePath);
  if (magicCheck === false) {
    console.error(`File does not appear to be an image: ${sourcePath}`);
    process.exit(1);
  }

  let targetName = sanitizeFilename(basename(sourcePath));
  if (!targetName.toLowerCase().endsWith(ext)) {
    targetName = `${targetName}${ext}`;
  }

  await mkdir(ATTACHMENTS_DIR, { recursive: true });

  let targetPath = join(ATTACHMENTS_DIR, targetName);
  if (existsSync(targetPath)) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:T]/g, "-")
      .slice(0, 19);
    const nameWithoutExt = targetName.slice(0, -ext.length);
    targetName = `${nameWithoutExt}-${timestamp}${ext}`;
    targetPath = join(ATTACHMENTS_DIR, targetName);
  }

  await copyFile(sourcePath, targetPath);

  if (commit) {
    const gitStatus = spawnSync("git", ["-C", NOTES_DIR, "status", "--porcelain"], {
      encoding: "utf8",
    });
    const isRepo = gitStatus.status === 0;
    if (!isRepo) {
      console.error(`Notes directory is not a git repository: ${NOTES_DIR}`);
      process.exit(1);
    }

    const addResult = spawnSync("git", ["-C", NOTES_DIR, "add", targetPath], {
      encoding: "utf8",
    });
    if (addResult.status !== 0) {
      console.error(`git add failed: ${addResult.stderr || addResult.stdout}`);
      process.exit(1);
    }

    const commitResult = spawnSync(
      "git",
      ["-C", NOTES_DIR, "commit", "-m", `Add attachment: ${targetName}`],
      { encoding: "utf8" },
    );
    if (commitResult.status !== 0) {
      console.error(
        `git commit failed: ${commitResult.stderr || commitResult.stdout}`,
      );
      process.exit(1);
    }

    const pushResult = spawnSync("git", ["-C", NOTES_DIR, "push"], {
      encoding: "utf8",
    });
    if (pushResult.status !== 0) {
      console.error(
        `git push failed: ${pushResult.stderr || pushResult.stdout}`,
      );
      process.exit(1);
    }
  }

  const markdownRef = `![${altText}](attachments/${targetName})`;
  console.log(markdownRef);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
