const isGraphQLError = (e) => e?.message?.includes("GraphQL server error");

const WA_CHANNEL_LINK = "https://whatsapp.com/channel/";

async function resolveChannel(conn, input) {
  input = input?.trim();
  if (!input) return null;

  if (input.startsWith(WA_CHANNEL_LINK)) {
    const code = input.split(WA_CHANNEL_LINK)[1];
    const meta = await conn.newsletterMetadata("invite", code);
    if (!meta?.id) return null;
    return { jid: meta.id, meta };
  }

  return { jid: input, meta: null };
}

function resolvedNote(meta) {
  if (!meta) return "";
  return `\nResolved JID : ${meta.id}`;
}

export default {
  name: "channel-manager",
  category: "core",
  command: [
    "createch",
    "delch",
    "infoch",
    "subch",
    "followch",
    "unfollowch",
    "mutech",
    "unmutech",
    "setnamech",
    "setdescch",
    "setppch",
    "delppch",
    "ownerch",
  ],
  settings: {
    owner: true,
    protected: true
  },

  run: async (conn, m) => {
    if (m.command === "createch") {
      const [name, description] = m.text.split("|").map((v) => v?.trim());

      if (!name) {
        return m.reply(
          "Usage: createch name\n" + "       createch name|description",
        );
      }

      try {
        const channel = await conn.newsletterCreate(
          name,
          description || undefined,
        );

        return m.reply(
          `Channel created.\n\n` +
            `Name        : ${channel.name}\n` +
            `ID          : ${channel.id}\n` +
            `Description : ${channel.description || "-"}\n` +
            `Subscribers : ${channel.subscribers}`,
        );
      } catch (e) {
        if (isGraphQLError(e)) {
          return m.reply(
            `Channel was created on WhatsApp, but the response could not be retrieved due to a Baileys limitation.\n\n` +
              `Check your WhatsApp to get the channel ID.`,
          );
        }
        throw e;
      }
    }

    if (m.command === "delch") {
      const resolved = await resolveChannel(conn, m.text || m.chat);
      if (!resolved) return m.reply("Usage: delch jid/link");

      try {
        await conn.newsletterDelete(resolved.jid);
      } catch (e) {
        if (!isGraphQLError(e)) throw e;
      }

      return m.reply(`Channel deleted.${resolvedNote(resolved.meta)}`);
    }

    if (m.command === "infoch") {
      const input = m.text.trim();

      if (!input) {
        return m.reply(
          "Usage: infoch jid/link\n" + "       infoch invite code",
        );
      }

      let meta;
      if (input.startsWith(WA_CHANNEL_LINK)) {
        const code = input.split(WA_CHANNEL_LINK)[1];
        meta = await conn.newsletterMetadata("invite", code);
      } else if (input.startsWith("invite ") || input.startsWith("invite\t")) {
        const code = input.slice(7).trim();
        meta = await conn.newsletterMetadata("invite", code);
      } else {
        meta = await conn.newsletterMetadata("jid", input);
      }

      if (!meta) return m.reply("Channel not found.");

      return m.reply(
        `Channel Info\n\n` +
          `Name         : ${meta.name}\n` +
          `ID           : ${meta.id}\n` +
          `Description  : ${meta.description || "-"}\n` +
          `Subscribers  : ${meta.subscribers}\n` +
          `Verification : ${meta.verification || "-"}`,
      );
    }

    if (m.command === "subch") {
      const resolved = await resolveChannel(conn, m.text || m.chat);
      if (!resolved) return m.reply("Usage: subch jid/link");

      const result = await conn.newsletterSubscribers(resolved.jid);
      return m.reply(
        `Subscribers: ${result.subscribers}${resolvedNote(resolved.meta)}`,
      );
    }

    if (m.command === "followch") {
      const resolved = await resolveChannel(conn, m.text);
      if (!resolved) return m.reply("Usage: followch jid/link");

      try {
        await conn.newsletterFollow(resolved.jid);
      } catch (e) {
        if (!isGraphQLError(e)) throw e;
      }

      return m.reply(`Channel followed.${resolvedNote(resolved.meta)}`);
    }

    if (m.command === "unfollowch") {
      const resolved = await resolveChannel(conn, m.text);
      if (!resolved) return m.reply("Usage: unfollowch jid/link");

      try {
        await conn.newsletterUnfollow(resolved.jid);
      } catch (e) {
        if (!isGraphQLError(e)) throw e;
      }

      return m.reply(`Channel unfollowed.${resolvedNote(resolved.meta)}`);
    }

    if (m.command === "mutech") {
      const resolved = await resolveChannel(conn, m.text || m.chat);
      if (!resolved) return m.reply("Usage: mutech jid/link");

      try {
        await conn.newsletterMute(resolved.jid);
      } catch (e) {
        if (!isGraphQLError(e)) throw e;
      }

      return m.reply(`Channel muted.${resolvedNote(resolved.meta)}`);
    }

    if (m.command === "unmutech") {
      const resolved = await resolveChannel(conn, m.text || m.chat);
      if (!resolved) return m.reply("Usage: unmutech jid/link");

      try {
        await conn.newsletterUnmute(resolved.jid);
      } catch (e) {
        if (!isGraphQLError(e)) throw e;
      }

      return m.reply(`Channel unmuted.${resolvedNote(resolved.meta)}`);
    }

    if (m.command === "setnamech") {
      const [rawJid, ...rest] = m.text.split("|").map((v) => v.trim());
      const name = rest.join("|").trim();

      if (!rawJid || !name) {
        return m.reply("Usage: setnamech jid/link|new name");
      }

      const resolved = await resolveChannel(conn, rawJid);
      if (!resolved) return m.reply("Invalid JID or link.");

      try {
        await conn.newsletterUpdateName(resolved.jid, name);
      } catch (e) {
        if (!isGraphQLError(e)) throw e;
      }

      return m.reply(
        `Channel name updated to: ${name}${resolvedNote(resolved.meta)}`,
      );
    }

    if (m.command === "setdescch") {
      const [rawJid, ...rest] = m.text.split("|").map((v) => v.trim());
      const description = rest.join("|").trim();

      if (!rawJid || !description) {
        return m.reply("Usage: setdescch jid/link|new description");
      }

      const resolved = await resolveChannel(conn, rawJid);
      if (!resolved) return m.reply("Invalid JID or link.");

      try {
        await conn.newsletterUpdateDescription(resolved.jid, description);
      } catch (e) {
        if (!isGraphQLError(e)) throw e;
      }

      return m.reply(
        `Channel description updated.${resolvedNote(resolved.meta)}`,
      );
    }

    if (m.command === "setppch") {
      const resolved = await resolveChannel(conn, m.text || m.chat);
      if (!resolved) return m.reply("Usage: setppch jid/link (reply an image)");

      if (!m.quoted?.isMedia) {
        return m.reply("Reply an image to set the channel profile picture.");
      }

      const buffer = await m.quoted.download();

      try {
        await conn.newsletterUpdatePicture(resolved.jid, buffer);
      } catch (e) {
        if (!isGraphQLError(e)) throw e;
      }

      return m.reply(
        `Channel profile picture updated.${resolvedNote(resolved.meta)}`,
      );
    }

    if (m.command === "delppch") {
      const resolved = await resolveChannel(conn, m.text || m.chat);
      if (!resolved) return m.reply("Usage: delppch jid/link");

      try {
        await conn.newsletterRemovePicture(resolved.jid);
      } catch (e) {
        if (!isGraphQLError(e)) throw e;
      }

      return m.reply(
        `Channel profile picture removed.${resolvedNote(resolved.meta)}`,
      );
    }

    if (m.command === "ownerch") {
      const [rawJid, newOwner] = m.text.split("|").map((v) => v.trim());

      if (!rawJid || !newOwner) {
        return m.reply("Usage: ownerch jid/link|newOwnerJid");
      }

      const resolved = await resolveChannel(conn, rawJid);
      if (!resolved) return m.reply("Invalid JID or link.");

      try {
        await conn.newsletterChangeOwner(resolved.jid, newOwner);
      } catch (e) {
        if (!isGraphQLError(e)) throw e;
      }

      return m.reply(
        `Channel ownership transferred to: ${newOwner}${resolvedNote(resolved.meta)}`,
      );
    }
  },
};
