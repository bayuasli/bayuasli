import fs from "fs/promises";
import path from "path";

const CONFIG_PATH = "./lib/database/theme.json";

class ThemeManager {
  constructor() {
    this.defaultFavicon = null;
    this.config = {
      title: "Z3PHWOLF BOT",
      description: "#–시간 Z3PHWOLF !",
      url: "https://sbyuxd.dev",
      favicon: null,
    };
  }

  getData() {
    return {
      ...this.config,
      favicon: this.config.favicon || this.defaultFavicon,
    };
  }

  setDefaultFavicon(data) {
    this.defaultFavicon = data;
  }

  async setTitle(title) {
    try {
      if (!title || typeof title !== "string") {
        return { error: "Title harus string" };
      }
      this.config.title = title.trim();
      await this.saveConfig();
      return { data: this.config.title };
    } catch (e) {
      return { error: e.message };
    }
  }

  async setDescription(description) {
    try {
      if (!description || typeof description !== "string") {
        return { error: "Description harus string" };
      }
      this.config.description = description.trim();
      await this.saveConfig();
      return { data: this.config.description };
    } catch (e) {
      return { error: e.message };
    }
  }

  async setUrl(url) {
    try {
      if (!url || typeof url !== "string") {
        return { error: "URL harus string" };
      }
      if (!/^https?:\/\//.test(url.trim())) {
        return { error: "URL harus diawali http:// atau https://" };
      }
      this.config.url = url.trim();
      await this.saveConfig();
      return { data: this.config.url };
    } catch (e) {
      return { error: e.message };
    }
  }

  async setFavicon(faviconData) {
    try {
      if (!faviconData) {
        this.config.favicon = null;
        await this.saveConfig();
        return { data: "Favicon dihapus, menggunakan default" };
      }

      const required = [
        "thumbnailDirectPath",
        "thumbnailSha256",
        "thumbnailEncSha256",
        "mediaKey",
        "mediaKeyTimestamp",
      ];
      for (const key of required) {
        if (!faviconData[key]) {
          return { error: "Data favicon tidak lengkap: " + key + " missing" };
        }
      }

      this.config.favicon = {
        thumbnailDirectPath: faviconData.thumbnailDirectPath,
        thumbnailSha256: faviconData.thumbnailSha256,
        thumbnailEncSha256: faviconData.thumbnailEncSha256,
        mediaKey: faviconData.mediaKey,
        mediaKeyTimestamp: faviconData.mediaKeyTimestamp,
        thumbnailHeight: 48,
        thumbnailWidth: 48,
      };

      await this.saveConfig();
      return { data: "Favicon diperbarui" };
    } catch (e) {
      return { error: e.message };
    }
  }

  async nuke() {
    try {
      this.config = {
        title: "Z3PHWOLF BOT",
        description: "#–시간 Z3PHWOLF !",
        url: "https://sbyuxd.dev",
        favicon: null,
      };
      await this.saveConfig();
      return { data: "Theme reset ke default" };
    } catch (e) {
      return { error: e.message };
    }
  }

  async saveConfig() {
    const dir = path.dirname(CONFIG_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, 2));
  }

  async loadConfig() {
    try {
      const data = await fs.readFile(CONFIG_PATH, "utf-8");
      const json = JSON.parse(data);
      this.config = {
        title: json.title || "Z3PHWOLF BOT",
        description: json.description || "#–시간 Z3PHWOLF !",
        url: json.url || "https://sbyuxd.dev",
        favicon: json.favicon || null,
      };
    } catch (e) {
      if (e.code === "ENOENT") {
        await this.saveConfig();
      } else {
        console.error("ThemeManager load error:", e.message);
      }
    }
  }

  async init() {
    await this.loadConfig();
  }
}

const themeManager = new ThemeManager();
await themeManager.init();

export { themeManager };
