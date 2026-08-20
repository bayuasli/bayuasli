import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const BASE_URL = "https://webappcreator.amethystlab.org";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Origin: BASE_URL,
  Referer: BASE_URL + "/",
};

export function generatePackageName(appName) {
  const cleaned = appName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `com.${cleaned}.app`;
}

export async function buildApk(
  websiteUrl,
  appName,
  iconBuffer,
  packageName,
  versionName = "1.0.0",
  versionCode = 1,
) {
  const tmpDir = "./tmp";
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const iconPath = path.join(tmpDir, `icon-${Date.now()}.jpg`);
  fs.writeFileSync(iconPath, iconBuffer);

  try {
    const form = new FormData();
    form.append("websiteUrl", websiteUrl);
    form.append("appName", appName);
    form.append("icon", fs.createReadStream(iconPath));
    form.append("packageName", packageName || generatePackageName(appName));
    form.append("versionName", versionName);
    form.append("versionCode", String(versionCode));

    const { data } = await axios.post(`${BASE_URL}/api/build-apk`, form, {
      headers: { ...HEADERS, ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000,
    });

    if (data.success) {
      data.fullDownloadUrl = `${BASE_URL}${data.downloadUrl}`;
    }
    return data;
  } finally {
    if (fs.existsSync(iconPath)) fs.unlinkSync(iconPath);
  }
}
