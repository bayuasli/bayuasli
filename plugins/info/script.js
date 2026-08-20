import { Button } from "#helper";

export default {
  name: "script",
  category: "info",
  command: ["sc", "script"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { Func }) => {
    try {
      const res = await Func.fetchJson(
        "https://api.github.com/repos/sbyuxD/WolfBot",
      );

      const infoText = [
        `*Informasi Script*`,
        "",
        `✨ *Nama:* ${res.name}`,
        `📝 *Deskripsi:* ${res.description ?? "-"}`,
        `👤 *Pemilik:* ${res.owner.login ?? "-"}`,
        `🌿 *Branch:* ${res.default_branch ?? "main"}`,
        `💻 *Bahasa:* ${res.language ?? "-"}`,
        `⭐ *Star:* ${res.stargazers_count ?? 0}`,
        `🍴 *Forks:* ${res.forks ?? 0}`,
        `👁️ *Watchers:* ${res.watchers_count ?? 0}`,
        `🐛 *Open Issues:* ${res.open_issues_count ?? 0}`,
        `📅 *Dibuat:* ${Func.ago(res.created_at)}`,
        `♻️ *Update terakhir:* ${Func.ago(res.updated_at)}`,
        `🚀 *Push terakhir:* ${Func.ago(res.pushed_at)}`,
      ].join("\n");

      const button = new Button(conn)
        .setTitle("🦊 ZephWolf")
        .setSubtitle("Script WhatsApp Bot")
        .setBody(infoText)
        .setFooter("© sbyuxD")
        .setImage(res.owner?.avatar_url || global.thumbnailUrl)
        .addUrl("🌐 Kunjungi Repo", res.html_url, true, { icon: "PROMOTION" });

      await button.send(m.chat, { quoted: m });
    } catch (e) {
      console.error(e);
      return m.reply("Gagal mengambil informasi script. Coba lagi nanti.");
    }
  },
};
