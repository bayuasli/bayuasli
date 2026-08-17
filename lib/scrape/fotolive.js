import { prepareWAMessageMedia, generateWAMessageFromContent } from "baileys";

export async function sendMotionPhoto(conn, jid, imageInput, videoInput) {
  const image = await prepareWAMessageMedia(
    { image: typeof imageInput === "string" ? { url: imageInput } : imageInput },
    { upload: conn.waUploadToServer }
  );

  const video = await prepareWAMessageMedia(
    { video: typeof videoInput === "string" ? { url: videoInput } : videoInput },
    { upload: conn.waUploadToServer }
  );

  const msg = generateWAMessageFromContent(
    jid,
    {
      imageMessage: {
        ...image.imageMessage,
        contextInfo: {
          pairedMediaType: 5,
          statusSourceType: 0
        }
      }
    },
    { userJid: conn.user?.id }
  );

  await conn.relayMessage(jid, msg.message, {
    messageId: msg.key.id
  });

  await conn.relayMessage(
    jid,
    {
      videoMessage: {
        ...video.videoMessage,
        contextInfo: {
          pairedMediaType: 6,
          statusSourceType: 0
        }
      },
      messageContextInfo: {
        messageAssociation: {
          associationType: 12,
          parentMessageKey: msg.key
        }
      }
    },
    {}
  );

  return msg;
}