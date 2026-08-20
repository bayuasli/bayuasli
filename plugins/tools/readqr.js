import axios from "axios";
import FormData from "form-data";

export default {
  name: "readqr",
  category: "tools",
  command: ["rqr", "readqr", "qrscan"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { downloadM }) => {
    if (
      !m.isQuoted ||
      !/image/.test((m.quoted.msg || m.quoted).mimetype || "")
    ) {
      return m.reply("Reply gambar QR code.");
    }

    try {
      const buffer = await downloadM();

      const form = new FormData();
      form.append("file", buffer, {
        filename: "qr.jpg",
        contentType: "image/jpeg",
      });

      const { data } = await axios.post(
        "https://api.qrserver.com/v1/read-qr-code/",
        form,
        {
          headers: form.getHeaders(),
        },
      );

      const result = data?.[0]?.symbol?.[0]?.data;

      if (!result)
        return m.reply("QR code tidak terbaca atau tidak ditemukan.");

      await m.reply(
        `*Hasil Scan QR*\n` +
          `${"─".repeat(20)}\n` +
          `${result}\n` +
          `${"─".repeat(20)}`,
      );
    } catch (e) {
      return m.reply("Error: " + e.message);
    }
  },
};
