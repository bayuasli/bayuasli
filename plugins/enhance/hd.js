import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";

async function getToken() {
  const html = await axios.get("https://www.iloveimg.com/upscale-image");
  const $ = cheerio.load(html.data);
  const script = $("script")
    .filter((i, el) => $(el).html().includes("ilovepdfConfig ="))
    .html();
  const json = JSON.parse(script.split("ilovepdfConfig = ")[1].split(";")[0]);
  const csrf = $('meta[name="csrf-token"]').attr("content");
  return { token: json.token, csrf };
}

async function uploadImage(server, headers, buffer, task) {
  const form = new FormData();
  form.append("name", "image.jpg");
  form.append("chunk", "0");
  form.append("chunks", "1");
  form.append("task", task);
  form.append("preview", "1");
  form.append("file", buffer, "image.jpg");

  const res = await axios.post(
    `https://${server}.iloveimg.com/v1/upload`,
    form,
    {
      headers: { ...headers, ...form.getHeaders() },
    },
  );
  return res.data;
}

async function hdr(buffer, scale = 2) {
  const { token, csrf } = await getToken();
  const servers = [
    "api1g",
    "api2g",
    "api3g",
    "api8g",
    "api9g",
    "api10g",
    "api11g",
    "api12g",
    "api13g",
    "api14g",
    "api15g",
    "api16g",
    "api17g",
    "api18g",
    "api19g",
    "api20g",
    "api21g",
    "api22g",
    "api24g",
    "api25g",
  ];
  const server = servers[Math.floor(Math.random() * servers.length)];
  const task =
    "r68zl88mq72xq94j2d5p66bn2z9lrbx20njsbw2qsAvgmzr11lvfhAx9kl87pp6yqgx7c8vg7sfbqnrr42qb16v0gj8jl5s0kq1kgp26mdyjjspd8c5A2wk8b4Adbm6vf5tpwbqlqdr8A9tfn7vbqvy28ylphlxdl379psxpd8r70nzs3sk1";

  const headers = {
    Authorization: "Bearer " + token,
    Origin: "https://www.iloveimg.com/",
    Cookie: "_csrf=" + csrf,
    "User-Agent": "Mozilla/5.0",
  };

  const upload = await uploadImage(server, headers, buffer, task);

  const form = new FormData();
  form.append("task", task);
  form.append("server_filename", upload.server_filename);
  form.append("scale", scale);

  const res = await axios.post(
    `https://${server}.iloveimg.com/v1/upscale`,
    form,
    {
      headers: { ...headers, ...form.getHeaders() },
      responseType: "arraybuffer",
    },
  );

  return Buffer.from(res.data);
}

export default {
  name: "hdr",
  category: "enhance",
  command: ["hd", "hd"],
  alias: [],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { quoted }) => {
    if (!quoted || !/image/.test(quoted.msg?.mimetype)) {
      return m.reply(`Kirim/reply foto dengan caption ${m.command || "hdr"}`);
    }

    await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

    try {
      const media = await quoted.download();
      const result = await hdr(media, 2);

      await conn.sendMessage(
        m.chat,
        {
          image: result,
          caption: "✅ HD Upscale berhasil!",
        },
        { quoted: m },
      );

      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (err) {
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      return m.reply("Gagal proses gambar: " + err.message);
    }
  },
};
