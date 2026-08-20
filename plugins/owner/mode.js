export default {
  name: "mode",
  category: "owner",
  command: ["public", "mode", "self"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true
  },

  run: async (conn, m) => {
    const mode = (m.text || "").trim().toLowerCase();

    if (!mode) {
      return m.reply(
        `# MODE BOT

• Status : *${global.IS_PUBLIC ? "PUBLIC" : "SELF"}*

# Penjelasan

• *PUBLIC*
_✓ Semua pengguna dapat menggunakan bot._
_✓ Pengguna non-owner wajib menggunakan prefix._
_✓ Owner dapat menggunakan command dengan atau tanpa prefix._

• *SELF*
_✓ Hanya owner yang dapat menggunakan bot._
_✓ Owner dapat menggunakan command dengan atau tanpa prefix._

# Penggunaan

.public on
.public off`,
      );
    }

    if (["on", "true", "1"].includes(mode)) {
      if (global.IS_PUBLIC) {
        return m.reply(
          `# MODE BOT

• Status : *PUBLIC*

_Bot sudah berada pada mode PUBLIC._`,
        );
      }

      global.IS_PUBLIC = true;

      return m.reply(
        `# MODE BOT

• Status : *PUBLIC*

_✓ Semua pengguna sekarang dapat menggunakan bot._
_✓ Pengguna non-owner wajib menggunakan prefix._
_✓ Owner tetap dapat menggunakan command dengan atau tanpa prefix._`,
      );
    }

    if (["off", "false", "0"].includes(mode)) {
      if (!global.IS_PUBLIC) {
        return m.reply(
          `# MODE BOT

• Status : *SELF*

_Bot sudah berada pada mode SELF._`,
        );
      }

      global.IS_PUBLIC = false;

      return m.reply(
        `# MODE BOT

• Status : *SELF*

_✓ Sekarang hanya owner yang dapat menggunakan bot._
_✓ Owner tetap dapat menggunakan command dengan atau tanpa prefix._`,
      );
    }

    return m.reply(
      `# MODE BOT

Pilihan yang tersedia:

• .public on
• .public off`,
    );
  },
};
