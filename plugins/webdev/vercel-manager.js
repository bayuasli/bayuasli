import fetch from "node-fetch";

export default {
  name: "vercel-manager",
  category: "webdev",
  command: ["web", "webm"],
  alias: ["delweb", "listweb", "delallweb"],
  settings: {
    owner: true,
    loading: false,
    protected: true
  },

  run: async (conn, m, ctx) => {
    const args = m.args || [];
    const sub = (args[0] || "").toLowerCase();
    const value = args.slice(1).join(" ");

    const tokenVercel = global.vercelToken;
    if (!tokenVercel) {
      return m.reply("*[ERROR]* Token Vercel tidak ditemukan dalam konfigurasi global.");
    }

    const headers = { Authorization: `Bearer ${tokenVercel}` };
    const isForce = args.some(arg => arg.toLowerCase() === "-force");

    if (m.command === "listweb" || (m.command === "web" && sub === "list")) {
      try {
        const projects = await getProjects(headers);
        if (!projects.length) {
          return m.reply("*[INFORMASI]* Tidak ada project web yang ditemukan pada akun Vercel Anda.");
        }

        let textList = `*SBYUXD - VERCEL PROJECTS*\n\n`;
        projects.forEach((proj, i) => {
          textList += `*${i + 1}. ${proj.name}*\n`;
          textList += `_https://${proj.name}.vercel.app_\n\n`;
        });

        return m.reply(textList.trim());
      } catch (err) {
        console.error("LISTWEB ERROR:", err);
        return m.reply("*[ERROR]* Gagal mengambil daftar web: " + err.message);
      }
    }

    if (m.command === "delweb" || (m.command === "web" && sub === "del")) {
      const input = value || args[0];

      const projects = await getProjects(headers);
      if (!projects.length) {
        return m.reply("*[INFORMASI]* Tidak ada project web yang ditemukan.");
      }

      if (!input || input.toLowerCase() === "del") {
        let listText = `*DAFTAR PROJECT VERCEL*\n\n`;
        projects.forEach((p, i) => {
          listText += `${i + 1}. _${p.name}_\n`;
        });
        listText += `\n*Format Penggunaan:*\n`;
        listText += `• .delweb <nama_project>\n`;
        listText += `• .delweb <nomor_index>\n`;
        listText += `• .delweb 1,2,3 (untuk menghapus banyak sekaligus)\n\n`;
        listText += `*Contoh:* .delweb 1,3`;

        return m.reply(listText);
      }

      let targets = [];

      if (input.includes(",")) {
        const indices = input
          .split(",")
          .map((n) => parseInt(n.trim()) - 1)
          .filter((i) => !isNaN(i) && i >= 0);
        targets = indices.map((i) => projects[i]?.name).filter(Boolean);
      } else if (!isNaN(input) && parseInt(input) > 0) {
        const idx = parseInt(input) - 1;
        if (projects[idx]) {
          targets = [projects[idx].name];
        }
      } else {
        const found = projects.find((p) => p.name === input);
        if (found) {
          targets = [found.name];
        }
      }

      if (!targets.length) {
        return m.reply("*[BATAL]* Nama atau nomor indeks project tidak ditemukan.");
      }

      const results = [];
      for (const name of targets) {
        try {
          const res = await fetch(`https://api.vercel.com/v9/projects/${name}`, {
            method: "DELETE",
            headers,
          });

          if (res.status === 200 || res.status === 204) {
            results.push(`[BERHASIL] ${name} telah dihapus`);
          } else if (res.status === 404) {
            results.push(`[LEWAT] ${name} tidak ditemukan`);
          } else {
            results.push(`[GAGAL] ${name} gagal diproses`);
          }
        } catch {
          results.push(`[ERROR] ${name} mengalami kendala koneksi`);
        }
      }

      return m.reply(`*HASIL EKSEKUSI PENGEPUASAN*\n\n` + results.map(r => `• ${r}`).join("\n"));
    }

    if (m.command === "delallweb" || (m.command === "web" && sub === "delall")) {
      const projects = await getProjects(headers);
      if (!projects.length) {
        return m.reply("*[INFORMASI]* Tidak ada project web yang ditemukan untuk dihapus.");
      }

      if (isForce) {
        await m.reply("*[PROSES]* Menghapus seluruh project web secara massal...");

        let deleted = 0;
        for (const proj of projects) {
          try {
            const res = await fetch(`https://api.vercel.com/v9/projects/${proj.name}`, {
              method: "DELETE",
              headers,
            });
            if (res.status === 200 || res.status === 204) {
              deleted++;
            }
          } catch {}
        }

        return m.reply(
          `*PROSES SELESAI*\n\n` +
          `• Berhasil dihapus: ${deleted}\n` +
          `• Total project: ${projects.length}`
        );
      }

      const list = projects.map((p, i) => `${i + 1}. _${p.name}_`).join("\n");

      return m.reply(
        `*⚠️ PERINGATAN SISTEM*\n\n` +
        `Anda akan menghapus secara permanen *${projects.length}* project berikut:\n` +
        `${list}\n\n` +
        `Ketik perintah di bawah ini untuk melanjutkan:\n` +
        `*• .delallweb -force*\n\n` +
        `_Tindakan ini tidak dapat dibatalkan._`
      );
    }

    return m.reply(
      `*SBYUXD VERCEL MANAGER*\n\n` +
      `• *.listweb* - Menampilkan semua daftar project\n` +
      `• *.delweb <nama/nomor>* - Menghapus project tertentu\n` +
      `• *.delallweb* - Menghapus seluruh project secara massal (memerlukan parameter -force)`
    );
  },
};

async function getProjects(headers) {
  try {
    const allProjects = [];
    let from = null;
    let hasMore = true;

    while (hasMore) {
      const url = from
        ? `https://api.vercel.com/v9/projects?from=${from}`
        : "https://api.vercel.com/v9/projects";

      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) break;

      const data = await res.json();
      if (!data.projects?.length) break;

      allProjects.push(...data.projects);
      from = data.pagination?.next;
      hasMore = !!from && data.projects.length > 0;
    }

    return allProjects;
  } catch {
    return [];
  }
}