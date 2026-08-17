import axios from "axios";

export default {
  name: "biologi",
  category: "ai",
  command: ["biologiai"],
  alias: ["biai"],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },
  run: async (conn, m, { Api, Func }) => {
    try {
      const instructions = m.text.replace(/^[^ ]+ ?/, "").trim();
      if (!instructions) {
        return await m.reply(
          "❗️ Mohon berikan instruksi untuk scrape AI Biologi.",
        );
      }

      const { v4: uuidv4 } = await import("uuid");
      const clientUserId = uuidv4();

      const clientHash = "9c8d4c3959694ca";

      const query = `
 mutation BrainToolsHomeworkHelperFirst(
   $clientHash: String!
   $clientUserId: String!
   $sessionSourceUrl: String!
   $gaCid: String!
   $requestType: String!
   $subject: String
   $instructions: String!
   $instructionsFromFiles: [String]
 ) {
   brainToolsHomeworkHelperFirst(
     clientHash: $clientHash
     clientUserId: $clientUserId
     sessionSourceUrl: $sessionSourceUrl
     gaCid: $gaCid
     requestType: $requestType
     subject: $subject
     instructions: $instructions
     instructionsFromFiles: $instructionsFromFiles
   ) {
     status { code message }
     generatedText
     responseGenIdHash
     chatIdHash
   }
 }
`;

      const variables = {
        clientHash,
        clientUserId,
        sessionSourceUrl: "https://edubrain.ai/",
        gaCid: "",
        requestType: "smart",
        subject: "Biology",
        instructions,
        instructionsFromFiles: [],
      };

      // Mengirim request ke API
      const response = await axios.post(
        "https://wrtools-api.es-tech.co/graphql/ai_call",
        {
          query,
          variables,
          operationName: "BrainToolsHomeworkHelperFirst",
        },
        {
          headers: {
            accept: "application/json",
            "accept-language": "id-ID",
            "content-type": "application/json",
            referer: "https://my.edubrain.ai/",
          },
        },
      );

      const data = response.data;
      if (data.errors) {
        return await m.reply(`❗️ Terjadi error: ${data.errors[0].message}`);
      }

      const result = data.data.brainToolsHomeworkHelperFirst;
      if (result.status.code !== 200) {
        return await m.reply(`❗️ Error: ${result.status.message}`);
      }

      await m.reply(`🧠Jawaban dari biologi Ai\n\n${result.generatedText}`);
    } catch (err) {
      console.error("Error:", err.message);
      await m.reply(
        `❗️ Terjadi kesalahan saat memproses permintaan: ${err.message}`,
      );
    }
  },
};
