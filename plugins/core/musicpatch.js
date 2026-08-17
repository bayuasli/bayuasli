export default {
  name: "musicpatch",
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

  onLoad: async (conn) => {
    if (conn._musicPatchApplied) return;
    conn._musicPatchApplied = true;

    const originalSendMessage = conn.sendMessage.bind(conn);

    conn.sendMessage = (jid, content, options = {}) => {
      return originalSendMessage(
        jid,
        {
          ...content,
          streamingSidecar: "Omw4hLediba3yg==",
          annotations: [
            {
              embeddedContent: {
                embeddedMusic: {
                  musicContentMediaId: 12,
                  songId: 11,
                  author: "yth.Z3PH",
                  title: "Z3PHWOLF !",
                  artistAttribution: "https://t.me/Z3PHRINE",
                },
              },
              embeddedAction: true,
            },
          ],
          mentions:
            content.mentions ||
            conn.parseMention(content?.text || content?.caption || ""),
        },
        {
          ...options,
          useCachedGroupMetadata: options.useCachedGroupMetadata ?? true,
        },
      );
    };
  },

  run: async () => {},
};
