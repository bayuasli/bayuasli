import { spamOtp } from "#lib/scrape/spamotp.js";

export default {
  name: "spamotp",
  category: "spam",
  command: ["spamotp", "otp"],
  alias: ["spam"],
  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    let target = null;

    if (m.isQuoted) {
      target = m.quoted.sender;
    } else if (m.mentions && m.mentions.length > 0) {
      target = m.mentions[0];
    } else if (m.text && m.text.trim()) {
      target = m.text.trim();
    }

    if (!target) {
      return m.reply(
        "Spam OTP\n\n" +
          "Usage:\n" +
          ".spamotp 6281234567890\n" +
          ".spamotp - reply pesan target\n" +
          ".spamotp @user - tag target",
      );
    }

    let phone = target;
    if (target.includes("@s.whatsapp.net")) {
      phone = target.replace("@s.whatsapp.net", "");
    }

    const statusMsg = await m.reply("Memulai spam OTP ke " + phone + "...");

    let statusText = "SPAM OTP KE " + phone + "\n\n";
    const results = [];

    const onProgress = async (i, total, result) => {
      const icon = result.success ? "✅" : "❌";
      results.push(result);
      statusText +=
        "[" + i + "/" + total + "] " + icon + " " + result.name + "\n";

      const success = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      statusText +=
        "\nProgress: " + success + " success, " + failed + " failed\n";

      await conn.sendMessage(m.chat, {
        text: statusText,
        edit: statusMsg.key,
      });
    };

    const result = await spamOtp(phone, onProgress);

    if (result.error) {
      return m.reply("Error: " + result.error);
    }

    let finalText =
      "SPAM OTP RESULT\n" +
      "────────────────\n" +
      "Target: " +
      phone +
      "\n" +
      "Success: " +
      result.success +
      "/" +
      result.total +
      "\n" +
      "Failed: " +
      result.failed +
      "/" +
      result.total +
      "\n" +
      "Time: " +
      result.elapsed.toFixed(1) +
      "s\n" +
      "────────────────\n";

    if (result.failedList.length > 0) {
      finalText += "Failed endpoints:\n";
      result.failedList.forEach((r) => {
        finalText += "• " + r.name + " (" + (r.status || "error") + ")\n";
      });
    }

    await conn.sendMessage(m.chat, {
      text: finalText,
      edit: statusMsg.key,
    });
  },
};
