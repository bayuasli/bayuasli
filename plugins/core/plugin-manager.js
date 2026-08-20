import fs from "fs";
import path from "path";
import { AIRich } from "#helper";

export default {
  name: "plugin-manager",
  category: "core",
  command: ["infoplug", "plugininfo", "pinfo"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const query = m.text?.trim().toLowerCase();
    if (!query) {
      return m.reply(
        "Gunakan: .infoplug <nama plugin>\nContoh: .infoplug menu",
      );
    }

    const plugins = global.plugins || {};
    let foundPlugin = null;
    let foundName = "";

    for (const [key, plugin] of Object.entries(plugins)) {
      const pluginName = plugin.name || key;
      if (pluginName.toLowerCase() === query || key.toLowerCase() === query) {
        foundPlugin = plugin;
        foundName = pluginName;
        break;
      }
      const cmds = Array.isArray(plugin.command)
        ? plugin.command
        : plugin.command
          ? [plugin.command]
          : [];
      if (cmds.some((c) => c.toLowerCase() === query)) {
        foundPlugin = plugin;
        foundName = pluginName;
        break;
      }
    }

    if (!foundPlugin) {
      const list = Object.values(plugins)
        .map((p) => p.name || "unknown")
        .join(", ");
      return m.reply(
        'Plugin "' + query + '" tidak ditemukan.\n\nDaftar plugin: ' + list,
      );
    }

    const pluginPath = findPluginPath(foundName);
    let lines = 0;
    let size = 0;
    let fileSize = "";

    if (pluginPath && fs.existsSync(pluginPath)) {
      const stats = fs.statSync(pluginPath);
      size = stats.size;
      const content = fs.readFileSync(pluginPath, "utf-8");
      lines = content.split("\n").length;

      if (size < 1024) {
        fileSize = size + " B";
      } else if (size < 1024 * 1024) {
        fileSize = (size / 1024).toFixed(1) + " KB";
      } else {
        fileSize = (size / (1024 * 1024)).toFixed(1) + " MB";
      }
    } else {
      lines = "?";
      fileSize = "?";
    }

    const cmds = Array.isArray(foundPlugin.command)
      ? foundPlugin.command.join(", ")
      : foundPlugin.command || "-";
    const aliases = Array.isArray(foundPlugin.alias)
      ? foundPlugin.alias.join(", ")
      : foundPlugin.alias || "-";
    const category = foundPlugin.category || "-";

    const settings = foundPlugin.settings || {};
    const activeSettings = [];
    const settingLabels = {
      owner: "Owner",
      private: "Private",
      group: "Group",
      admin: "Admin",
      botAdmin: "BotAdmin",
      loading: "Loading",
    };

    for (const [key, label] of Object.entries(settingLabels)) {
      if (settings[key] === true) {
        activeSettings.push(label);
      }
    }

    const settingsText =
      activeSettings.length > 0 ? activeSettings.join(", ") : "None";

    const infoText =
      "┌──────────────────\n" +
      "│ Name      : " +
      foundName +
      "\n" +
      "│ Category  : " +
      category +
      "\n" +
      "│ Lines     : " +
      lines +
      "\n" +
      "│ Size      : " +
      fileSize +
      "\n" +
      "│ Command   : " +
      cmds +
      "\n" +
      "│ Alias     : " +
      aliases +
      "\n" +
      "│ Settings  : " +
      settingsText +
      "\n" +
      "└──────────────────";

    try {
      await new AIRich(conn)
        .setTitle("🔍 PLUGIN INFO")
        .setFooter("Z3PH")
        .addSuggest("PluginManager")
        .addSuggest(["sbyuxD", "Z3PHRINE", "infoplug", foundName])
        .addTip("📋 Informasi detail plugin " + foundName)
        .addText(
          `
# ── sbyuxD BOT ──

---

[Z3PHRINE](!https://t.me/Z3PHRINE)
    `,
        )
        .addProduct({
          title: "sbyuxD Bot",
          brand: "Z3PHRINE",
          price: "Rp 0",
          sale_price: "Rp 0",
          url: "https://wa.me/6288228819127",
          image: "https://img2.pixhost.to/images/9264/748304653_sbyuxd.jpg",
        })
        .addCode(
          "javascript",
          "// Plugin: " +
            foundName +
            "\n" +
            "export default {\n" +
            '  name: "' +
            foundName +
            '",\n' +
            '  category: "' +
            category +
            '",\n' +
            "  command: [" +
            cmds
              .split(", ")
              .map((c) => '"' + c + '"')
              .join(", ") +
            "],\n" +
            "  settings: { " +
            activeSettings.map((s) => s.toLowerCase() + ": true").join(", ") +
            " }\n" +
            "}",
        )
        .addTable([
          ["Property", "Value"],
          ["Name", foundName],
          ["Category", category],
          ["Lines", String(lines)],
          ["Size", fileSize],
          ["Commands", cmds],
          ["Aliases", aliases],
          ["Settings", settingsText],
        ])
        .addSource([
          [
            "https://img2.pixhost.to/images/9241/748114493_sbyuxd.jpg",
            "https://github.com/sbyuxD/",
            "GitHub",
          ],
          [
            "https://img2.pixhost.to/images/9264/748304653_sbyuxd.jpg",
            "https://wa.me/6288228819127",
            "Whatsapp",
          ],
        ])
        .addTip(infoText)
        .send(m.chat, { quoted: m });
    } catch (err) {
      console.error("[infoplug]", err);
      return m.reply(infoText);
    }
  },
};

function findPluginPath(pluginName) {
  const baseDir = path.join(process.cwd(), "plugins");
  const searchDir = (dir) => {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const result = searchDir(fullPath);
          if (result) return result;
        } else if (file.endsWith(".js")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          if (content.includes("name:") && content.includes(pluginName)) {
            return fullPath;
          }
        }
      }
    } catch {}
    return null;
  };
  return searchDir(baseDir);
}
