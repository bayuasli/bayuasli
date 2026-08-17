/**
 * Copyright (c) 2025 PurrBits
 * Released under the ISC License.
 * https://opensource.org/licenses/ISC
 */

import { readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { EventEmitter } from "node:events";
import chokidar from "chokidar";

import log from "#lib/logger.js";

async function importModule(modulePath) {
  const moduleURL = `${pathToFileURL(modulePath).href}?id=${Date.now()}`;
  try {
    const esm = await import(moduleURL);
    return esm?.default ?? esm;
  } catch (error) {
    log.error(`Error importing module ${modulePath}: ${error.message}`);
    throw error;
  }
}

export default class PluginsLoad extends EventEmitter {
  constructor(directory, { debug = false } = {}) {
    super();
    if (!directory) throw new Error("Plugins path is required.");

    this.directory = resolve(directory);
    this.plugins = {};
    this.watcher = null;
    this.debug = debug;
  }

  async add(filePath, { silent = false } = {}) {
    try {
      if (filePath in this.plugins) delete this.plugins[filePath];

      const plugin = await importModule(filePath);
      this.plugins[filePath] = plugin;

      if (this.debug && !silent) log.success(`Loaded plugin: ${filePath}`);
      this.emit("change", filePath, plugin);
      return plugin;
    } catch (error) {
      delete this.plugins[filePath];
      if (!silent)
        log.error(`Failed to load plugin ${filePath}: ${error.message}`);
      this.emit("change", filePath, null);
      return null;
    }
  }

  async scan(dir = this.directory) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
        .filter((entry) => !entry.name.startsWith("."))
        .sort((a, b) => a.name.localeCompare(b.name));

      const files = entries.filter(
        (entry) => entry.isFile() && entry.name.endsWith(".js"),
      );
      const dirs = entries.filter((entry) => entry.isDirectory());

      await Promise.all(
        files.map((entry) => this.add(join(dir, entry.name), { silent: true })),
      );

      for (const entry of dirs) {
        await this.scan(join(dir, entry.name));
      }
    } catch (error) {
      log.error(`Error scanning directory ${dir}: ${error.message}`);
    }
  }

  async load() {
    await this.scan();
    log.info(
      `Loaded ${Object.keys(this.plugins).length} plugins successfully.`,
    );

    if (this.watcher) await this.watcher.close();

    this.watcher = chokidar.watch(this.directory, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    });

    this.watcher
      .on("add", async (path) => {
        if (path.endsWith(".js")) {
          await this.add(path);
          log.info(`Detected new plugin: ${path}`);
        }
      })
      .on("change", async (path) => {
        if (path.endsWith(".js")) {
          await this.add(path);
          log.info(`Updated plugin: ${path}`);
        }
      })
      .on("unlink", (path) => {
        if (path in this.plugins) {
          delete this.plugins[path];
          this.emit("change", path, null);
          log.warn(`Removed plugin: ${path}`);
        }
      })
      .on("error", (error) => log.error(`Watcher error: ${error}`));
  }
}
