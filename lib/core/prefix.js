import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "lib/database/prefix.json");
const defaultPrefixes = [
  ".", "!", "#", "/", "?", "°", "×", "÷", "€", "+", "=", "~", "^", "%", "@", "|"
];

function ensureDb() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(
      dbPath,
      JSON.stringify({ enabled: true, prefixes: defaultPrefixes }, null, 2)
    );
  }
}

export function loadPrefixConfig() {
  ensureDb();
  try {
    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    return {
      enabled: data.enabled ?? true,
      prefixes: Array.isArray(data.prefixes) && data.prefixes.length ? data.prefixes : defaultPrefixes
    };
  } catch {
    return { enabled: true, prefixes: defaultPrefixes };
  }
}

export function savePrefixConfig(config) {
  ensureDb();
  fs.writeFileSync(dbPath, JSON.stringify(config, null, 2));
}

export function loadPrefixes() {
  return loadPrefixConfig().prefixes;
}

export function savePrefixes(prefixes) {
  const config = loadPrefixConfig();
  config.prefixes = prefixes;
  savePrefixConfig(config);
}

function escapeForCharClass(char) {
  return char.replace(/[\^\]\\-]/g, "\\$&");
}

export function getPrefixRegex() {
  const prefixes = loadPrefixes();
  const escaped = prefixes.map(escapeForCharClass).join("");
  return new RegExp(`^[${escaped}]`, "i");
}