import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function uploadVidey(buffer) {
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const tempPath = path.join(tmpDir, Date.now() + ".mp4");
  fs.writeFileSync(tempPath, buffer);

  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(tempPath), {
      filename: path.basename(tempPath),
      contentType: "video/mp4",
    });

    const res = await axios.post(
      "https://videy.co/api/upload?visitorId=" + crypto.randomUUID(),
      form,
      {
        headers: {
          ...form.getHeaders(),
          "User-Agent": "Mozilla/5.0",
          origin: "https://videy.co",
          referer: "https://videy.co/",
          accept: "application/json",
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000,
      },
    );

    if (!res.data?.link) {
      throw new Error(
        "Response tidak berisi link: " + JSON.stringify(res.data),
      );
    }

    return res.data.link;
  } finally {
    fs.unlinkSync(tempPath);
  }
}
