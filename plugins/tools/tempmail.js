import axios from "axios";
import { sendList, sendQuickReply, sendMixedButton } from "#lib/interactive.js";

const BASE_URL = "https://mail-server.1timetech.com/api/email";
const HEADERS = {
  "User-Agent": "okhttp/4.9.2",
  Connection: "Keep-Alive",
  Accept: "application/json, text/plain, */*",
  "Accept-Encoding": "gzip",
  "x-app-key": "f07bed4503msh719c2010df3389fp1d6048jsn411a41a84a3c",
};

const atob = (s) => Buffer.from(s, "base64").toString("utf8");
const decode = (enc) => {
  const str = enc.startsWith("=") ? enc.slice(1) : enc;
  return JSON.parse(atob(str.split("").reverse().join("")));
};

if (!global.tempmailSessions) global.tempmailSessions = new Map();
const sessions = global.tempmailSessions;

export default {
  name: "tempmail",
  category: "tools",
  command: ["tempmail", "tmail"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    try {
      const sub = m.args[0]?.toLowerCase();
      const session = sessions.get(m.sender);

      if (!sub) {
        return sendList(
          conn,
          m.chat,
          {
            title: "📧 TempMail",
            body:
              `*TempMail — Email Sementara*\n\n` +
              `Status: ${session ? `🟢 Aktif (${session.email})` : "🔴 Tidak ada sesi"}`,
            footer: global.nameown || "SbyuXd",
            listTitle: "Pilih Menu",
            sections: [
              {
                title: "📧 Email",
                rows: [
                  {
                    title: "Buat Email Baru",
                    description: "Generate email sementara 10 menit",
                    id: ".tmail new",
                  },
                  {
                    title: "Cek Inbox",
                    description: "Lihat email masuk",
                    id: ".tmail inbox",
                  },
                  {
                    title: "Info Sesi",
                    description: "Lihat email aktif + sisa waktu",
                    id: ".tmail info",
                  },
                  {
                    title: "Stop Sesi",
                    description: "Tutup sesi email aktif",
                    id: ".tmail stop",
                  },
                ],
              },
            ],
          },
          { quoted: m },
        );
      }

      if (sub === "new") {
        await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

        const res = await axios.post(
          BASE_URL,
          { data: "" },
          {
            headers: { ...HEADERS, "Content-Type": "application/json" },
          },
        );

        const generated = decode(res.data.data);
        const email = generated.email || generated.address || generated;
        const expireAt = Date.now() + 10 * 60 * 1000;

        if (sessions.has(m.sender)) {
          clearInterval(sessions.get(m.sender).interval);
        }

        let lastCount = 0;

        const interval = setInterval(async () => {
          try {
            if (Date.now() > expireAt) {
              clearInterval(interval);
              sessions.delete(m.sender);
              await sendQuickReply(
                conn,
                m.chat,
                {
                  title: "⏰ Sesi TempMail Berakhir",
                  body: `Email *${email}* sudah tidak aktif.`,
                  footer: global.nameown || "SbyuXd",
                  buttons: [{ text: "📧 Buat Email Baru", id: ".tmail new" }],
                },
                { quoted: m },
              );
              return;
            }

            const inboxRes = await axios.get(`${BASE_URL}/${email}/messages`, {
              params: { params: "=03e", _: Date.now() },
              headers: HEADERS,
            });

            const messages = decode(inboxRes.data.data);
            if (!messages?.length || messages.length === lastCount) return;
            lastCount = messages.length;

            const latest = messages[messages.length - 1];
            await sendQuickReply(
              conn,
              m.chat,
              {
                title: "📨 Email Baru Masuk!",
                body:
                  `Dari    : ${latest.from || latest.fromText || "-"}\n` +
                  `Subject : ${latest.subject || "-"}\n` +
                  `Isi     : ${(latest.text || "-").slice(0, 400)}`,
                footer: global.nameown || "SbyuXd",
                buttons: [
                  { text: "📥 Lihat Inbox", id: ".tmail inbox" },
                  { text: "🛑 Stop", id: ".tmail stop" },
                ],
              },
              { quoted: m },
            );
          } catch {}
        }, 30000);

        sessions.set(m.sender, { email, interval, expireAt });

        await sendMixedButton(
          conn,
          m.chat,
          {
            title: "📧 TempMail Berhasil Dibuat",
            body:
              `Email   : ${email}\n` +
              `Expired : 10 menit\n\n` +
              `Bot akan otomatis notif jika ada email masuk.`,
            footer: global.nameown || "SbyuXd",
            buttons: [
              { type: "copy", text: "📋 Copy Email", code: email },
              { type: "reply", text: "📥 Cek Inbox", id: ".tmail inbox" },
              { type: "reply", text: "🛑 Stop", id: ".tmail stop" },
            ],
          },
          { quoted: m },
        );

        await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
        return;
      }

      if (sub === "inbox") {
        if (!session)
          return sendQuickReply(
            conn,
            m.chat,
            {
              title: "❌ Tidak Ada Sesi",
              body: "Kamu belum punya email aktif.",
              footer: global.nameown || "SbyuXd",
              buttons: [{ text: "📧 Buat Email Baru", id: ".tmail new" }],
            },
            { quoted: m },
          );

        await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

        const res = await axios.get(`${BASE_URL}/${session.email}/messages`, {
          params: { params: "=03e", _: Date.now() },
          headers: HEADERS,
        });

        const messages = decode(res.data.data);

        if (!messages?.length) {
          await sendQuickReply(
            conn,
            m.chat,
            {
              title: "📥 Inbox Kosong",
              body: `Email: ${session.email}\n\nBelum ada email masuk.`,
              footer: global.nameown || "SbyuXd",
              buttons: [
                { text: "🔄 Refresh", id: ".tmail inbox" },
                { text: "🛑 Stop", id: ".tmail stop" },
              ],
            },
            { quoted: m },
          );
          await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
          return;
        }

        const list = messages
          .slice(-5)
          .map(
            (msg, i) =>
              `*${i + 1}.* ${msg.subject || "-"}\n` +
              `   Dari : ${msg.from || msg.fromText || "-"}\n` +
              `   Isi  : ${(msg.text || "-").slice(0, 200)}`,
          )
          .join("\n\n");

        await sendQuickReply(
          conn,
          m.chat,
          {
            title: "📥 Inbox TempMail",
            body: `Email: ${session.email}\n\n${list}`,
            footer: global.nameown || "SbyuXd",
            buttons: [
              { text: "🔄 Refresh", id: ".tmail inbox" },
              { text: "📋 Copy Email", id: `.tmail copy` },
              { text: "🛑 Stop", id: ".tmail stop" },
            ],
          },
          { quoted: m },
        );

        await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
        return;
      }

      if (sub === "copy") {
        if (!session) return m.reply("Tidak ada sesi aktif.");
        await sendMixedButton(
          conn,
          m.chat,
          {
            title: "📋 Copy Email",
            body: `Email aktif kamu:\n${session.email}`,
            footer: global.nameown || "SbyuXd",
            buttons: [
              { type: "copy", text: "📋 Copy Email", code: session.email },
              { type: "reply", text: "📥 Inbox", id: ".tmail inbox" },
            ],
          },
          { quoted: m },
        );
        return;
      }

      if (sub === "stop") {
        if (!session)
          return sendQuickReply(
            conn,
            m.chat,
            {
              title: "❌ Tidak Ada Sesi",
              body: "Tidak ada sesi aktif yang bisa dihentikan.",
              footer: global.nameown || "SbyuXd",
              buttons: [{ text: "📧 Buat Email Baru", id: ".tmail new" }],
            },
            { quoted: m },
          );

        clearInterval(session.interval);
        sessions.delete(m.sender);

        await sendQuickReply(
          conn,
          m.chat,
          {
            title: "✅ Sesi Ditutup",
            body: `Email *${session.email}* berhasil dihentikan.`,
            footer: global.nameown || "SbyuXd",
            buttons: [{ text: "📧 Buat Email Baru", id: ".tmail new" }],
          },
          { quoted: m },
        );
        return;
      }

      if (sub === "info") {
        if (!session)
          return sendQuickReply(
            conn,
            m.chat,
            {
              title: "❌ Tidak Ada Sesi",
              body: "Kamu belum punya email aktif.",
              footer: global.nameown || "SbyuXd",
              buttons: [{ text: "📧 Buat Email Baru", id: ".tmail new" }],
            },
            { quoted: m },
          );

        const sisa = Math.max(
          0,
          Math.floor((session.expireAt - Date.now()) / 1000),
        );
        const menit = Math.floor(sisa / 60);
        const detik = sisa % 60;

        await sendMixedButton(
          conn,
          m.chat,
          {
            title: "📧 Info TempMail",
            body: `Email : ${session.email}\n` + `Sisa  : ${menit}m ${detik}s`,
            footer: global.nameown || "SbyuXd",
            buttons: [
              { type: "copy", text: "📋 Copy Email", code: session.email },
              { type: "reply", text: "📥 Inbox", id: ".tmail inbox" },
              { type: "reply", text: "🛑 Stop", id: ".tmail stop" },
            ],
          },
          { quoted: m },
        );
        return;
      }

      return sendList(
        conn,
        m.chat,
        {
          title: "📧 TempMail",
          body: "Sub-command tidak dikenal. Pilih menu:",
          footer: global.nameown || "sbyuxD",
          listTitle: "Pilih Menu",
          sections: [
            {
              title: "📧 Email",
              rows: [
                {
                  title: "Buat Email Baru",
                  description: "Generate email sementara 10 menit",
                  id: ".tmail new",
                },
                {
                  title: "Cek Inbox",
                  description: "Lihat email masuk",
                  id: ".tmail inbox",
                },
                {
                  title: "Info Sesi",
                  description: "Lihat email aktif + sisa waktu",
                  id: ".tmail info",
                },
                {
                  title: "Stop Sesi",
                  description: "Tutup sesi email aktif",
                  id: ".tmail stop",
                },
              ],
            },
          ],
        },
        { quoted: m },
      );
    } catch (e) {
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      await m.reply("Error: " + e.message);
    }
  },
};
