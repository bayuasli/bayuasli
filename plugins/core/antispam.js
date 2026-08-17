import { trackMessage, isBanned } from "#lib/core/antispam.js";

export default {
  name: "antispam",
  category: "core",
  command: [],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  on: async (conn, m, ctx = {}) => {
    if (ctx.isOwner) return;
    if (m.isBot) return;
    if (
      m.type === "protocolMessage" ||
      m.type === "reactionMessage" ||
      m.type === "pollUpdateMessage"
    )
      return;
    if (isBanned(m.sender)) return;

    await trackMessage(conn, m);
  },

  run: async () => {},
};
