import { buildApk, generatePackageName } from "#scrape/web2apk.js";
import axios from "axios";

export default {
  name: "web2apk",
  category: "converter",
  command: ["toapp", "web2apk"],
  alias: [],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { downloadM, quoted }) => {
    try {
      if (!m.isQuoted || !/image/.test((quoted.msg || quoted).mimetype || "")) {
        return m.reply(
          "Web to APK\n\n" +
            "Format: reply foto lalu\n" +
            ".toapp <url> | <nama app> | <package> | <versi>\n\n" +
            "Contoh:\n" +
            ".toapp https://youtube.com | YouTube Pro | com.yt.pro | 1.0.0",
        );
      }

      const args = m.text?.split("|").map((s) => s.trim()) || [];
      const [url, appName, packageName, versionName = "1.0.0"] = args;

      if (!url || !appName) {
        return m.reply(
          "Format: .toapp <url> | <nama app> | <package> | <versi>",
        );
      }

      await m.reply("Membangun APK, mohon tunggu...");

      const iconBuffer = await downloadM();
      const result = await buildApk(
        url,
        appName,
        iconBuffer,
        packageName,
        versionName,
      );

      if (!result.success) {
        return m.reply(
          "Gagal build APK: " + (result.message || "Unknown error"),
        );
      }

      await m.reply("Berhasil build, mengunduh APK...");

      const apkRes = await axios.get(result.fullDownloadUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
      });

      const apkBuffer = Buffer.from(apkRes.data);
      const fileName = `${appName.replace(/\s+/g, "_")}-${versionName}.apk`;
      const finalPackage = packageName || generatePackageName(appName);

      await conn.sendMessage(
        m.chat,
        {
          document: apkBuffer,
          mimetype: "application/vnd.android.package-archive",
          fileName: fileName,
          caption:
            "Web to APK\n\n" +
            "Nama: " +
            appName +
            "\n" +
            "Package: " +
            finalPackage +
            "\n" +
            "Versi: " +
            versionName +
            "\n" +
            "URL: " +
            url,
        },
        { quoted: m },
      );
    } catch (err) {
      console.error("Web2Apk Error:", err);
      return m.reply("Gagal: " + err.message);
    }
  },
};
