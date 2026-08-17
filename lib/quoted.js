const pushname = "sbyuxD";
const botname = "Z3PH";
const ownername = "sbyuxD";
const wm = "sbyuxD";

export const qtext = {
  key: {
    remoteJid: "status@broadcast",
    fromMe: false,
    participant: "0@s.whatsapp.net",
  },
  message: {
    newsletterAdminInviteMessage: {
      newsletterJid: "120363421313094892@newsletter",
      caption: "PUTRA Z3PHRINE",
      inviteExpiration: 0,
    },
  },
};

export const metaai = {
  key: {
    remoteJid: "status@broadcast",
    fromMe: false,
    id: "FAKE_META_ID_001",
    participant: "13135550002@s.whatsapp.net",
  },
  message: {
    contactMessage: {
      displayName: "Meta Ai",
      vcard: `BEGIN:VCARD\nVERSION:3.0\nN:sbyuxD;;;;\nFN:sbyuxD\nTEL;waid=13135550002:+1 313 555 0002\nEND:VCARD`,
    },
  },
};

export const pixx = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast",
  },
  message: {
    interactiveMessage: {
      nativeFlowMessage: {
        buttons: [
          {
            name: "payment_info",
            buttonParamsJson: JSON.stringify({
              payment_settings: [
                {
                  type: "pix_static_code",
                  pix_static_code: {
                    merchant_name: "bxx",
                    key: ownername,
                    key_type: "PHONE",
                  },
                },
              ],
            }),
          },
        ],
      },
    },
  },
};

export const pay = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast",
  },
  message: { paymentInviteMessage: { serviceType: 3, expiryTimestamp: "200" } },
};

export const pack = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast",
  },
  message: { stickerPackMessage: { name: pushname, publisher: ownername } },
};

export const poll = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast",
  },
  message: {
    pollCreationMessageV3: {
      name: pushname,
      options: [{ optionName: "sbyuxD" }, { optionName: "Sigma" }],
      selectableOptionsCount: 1,
    },
  },
};

export const vn = {
  key: { participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
  message: {
    audioMessage: {
      mimetype: "audio/ogg; codecs=opus",
      seconds: 359996400,
      ptt: "true",
    },
  },
};

export const gif = {
  key: { participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
  message: {
    videoMessage: {
      title: botname,
      h: wm,
      seconds: "359996400",
      gifPlayback: "true",
      caption: ownername,
    },
  },
};

export const gc = {
  key: { participant: "0@s.whatsapp.net", remoteJid: "0@s.whatsapp.net" },
  message: {
    groupInviteMessage: {
      groupJid: "120363427920837478@g.us",
      inviteCode: "m",
      groupName: "Mark Zuckerberg",
      caption: "Mark Zuckerberg",
    },
  },
};

export const video = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast",
  },
  message: {
    videoMessage: {
      title: botname,
      h: wm,
      seconds: "359996400",
      caption: pushname,
    },
  },
};

export const loc = {
  key: { participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
  message: { locationMessage: { name: pushname } },
};

export const kontak = {
  key: { participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
  message: {
    contactMessage: {
      displayName: ownername,
      vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;${ownername},;;;\nFN:${ownername}\nitem1.TEL;waid=628895307489:628895307489\nitem1.X-ABLabel:Mobile\nEND:VCARD`,
      sendEphemeral: true,
    },
  },
};

export const salr = {
  key: { remoteJid: "0@s.whatsapp.net", participant: "0@s.whatsapp.net" },
  message: {
    newsletterAdminInviteMessage: {
      newsletterJid: "120363421313094892@newsletter",
      newsletterName: ownername,
      caption: pushname,
    },
  },
};

export const order = {
  key: {
    remoteJid: "status@broadcast",
    fromMe: false,
    id: "BAE5C9E3C9A6C8D6",
    participant: "0@s.whatsapp.net",
  },
  message: {
    orderMessage: {
      productId: "8569472943180260",
      currencyCode: "USD",
      priceAmount1000: "97655971819",
      message: pushname,
      surface: ownername,
    },
  },
};
