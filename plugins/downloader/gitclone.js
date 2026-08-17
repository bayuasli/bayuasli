export default {
  name: "gitclone",
  category: "downloader",
  command: ["gitclone"],

  run: async (conn, m) => {
    try {
      const args = m.body.split(" ").slice(1);
      const urlInput = args[0];

      if (!urlInput)
        return m.reply("Contoh:\n.gitclone https://github.com/user/repo");

      const regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;

      const isUrl = (url) =>
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi.test(
          url,
        );

      if (!isUrl(urlInput) && !urlInput.includes("github.com"))
        return m.reply("❌ URL GitHub tidak valid");

      let [, user, repo] = urlInput.match(regex) || [];
      if (!user || !repo) return m.reply("❌ Format repo tidak valid");

      repo = repo.replace(/\.git$/, "");
      const apiUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;
      const fileName = `${encodeURIComponent(repo)}.zip`;

      await conn.sendMessage(
        m.chat,
        {
          document: { url: apiUrl },
          fileName,
          mimetype: "application/zip",
          caption: `📦 *GitHub Clone*\n🔗 ${urlInput}`,
        },
        { quoted: m },
      );
    } catch (e) {
      console.error("GITCLONE ERROR:", e);
      m.reply("❌ Gagal mengambil repo.");
    }
  },
};
