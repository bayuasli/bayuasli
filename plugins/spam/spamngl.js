export default {
  name: "spamngl",
  category: "spam",
  command: ["spamngl"],

  async run(conn, m) {
    try {
      const text = m.text || "";

      if (!text || !text.includes("|")) {
        return m.reply(
          `Contoh : .spamngl https://ngl.link/bayuror|3|wiwokdetok`,
        );
      }

      let [link, jumlahStr, ...pesanArr] = text.split("|");
      let jumlah = parseInt(jumlahStr);
      let pesan = pesanArr.join("|").trim();

      if (!link.startsWith("https://ngl.link/")) {
        return m.reply("❌ Link harus diawali dengan https://ngl.link/");
      }

      if (!pesan) {
        return m.reply("❌ Pesan tidak boleh kosong.");
      }

      if (isNaN(jumlah) || jumlah < 1) {
        return m.reply("❌ Jumlah harus angka dan minimal 1.");
      }

      const username = link.split("https://ngl.link/")[1];
      if (!username) {
        return m.reply("❌ Username tidak ditemukan di link.");
      }

      m.reply("⏳ Mengirim spam NGL...");

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      let successCount = 0;

      for (let i = 0; i < jumlah; i++) {
        try {
          await fetch("https://ngl.link/api/submit", {
            method: "POST",
            headers: {
              accept: "*/*",
              "content-type":
                "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: `username=${username}&question=${encodeURIComponent(pesan)}&deviceId=1`,
          });
          successCount++;
          await delay(500);
        } catch (e) {
          console.error("[NGL SEND ERROR]", e);
        }
      }

      m.reply(
        `✅ Selesai mengirim ${successCount}/${jumlah} pesan ke @${username}`,
      );
    } catch (err) {
      console.error("[NGL PLUGIN ERROR]", err);
      m.reply(`❌ Gagal mengirim pesan: ${err.message || err}`);
    }
  },
};
