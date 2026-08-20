import { uploadVidey } from "#scrape/videy.js";

export default {
  name: "videy",
  category: "uploader",
  command: ["upvidey", "videyup"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false
  },

  run: async (conn, m) => {
    if (!m.isQuoted || !m.quoted.isMedia) {
      return m.reply("Reply video");
    }

    const mime = m.quoted.msg?.mimetype || "";
    if (!mime.startsWith("video/")) {
      return m.reply("Reply video");
    }

    try {
      const videoBuffer = await m.quoted.download();
      const link = await uploadVidey(videoBuffer);
      return m.reply(link);
    } catch (err) {
      console.error("[videy]", err);
      if (err.response) {
        return m.reply(
          "Error: " +
            err.response.status +
            " - " +
            JSON.stringify(err.response.data),
        );
      }
      if (err.message?.includes("ECONNRESET")) {
        return m.reply(
          "Error: Connection reset, tapi upload mungkin berhasil. Coba lagi.",
        );
      }
      return m.reply("Error: " + err.message);
    }
  },
};
