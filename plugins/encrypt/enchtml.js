import crypto from "crypto";
import { Button } from "#helper";

const pendingHtml = new Map();
const EXPIRY_MS = 5 * 60 * 1000;

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of pendingHtml) {
    if (now - val.timestamp > EXPIRY_MS) pendingHtml.delete(key);
  }
}

function encryptDynamicKey(html) {
  const iv1 = crypto.randomBytes(12);
  const iv2 = crypto.randomBytes(12);
  const key1 = crypto.randomBytes(32);
  const key2 = crypto.randomBytes(32);

  const aesEncrypt = (data, key, iv) => {
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([encrypted, tag]);
  };

  const enc = Buffer.from(html, "utf-8");
  const step1 = aesEncrypt(enc, key1, iv1);
  const step2 = aesEncrypt(step1, key2, iv2);

  const hash = crypto.createHash("sha256").update(enc).digest("hex");
  const cipherText = step2.toString("base64");

  const kHex = Buffer.concat([key1, key2]).toString("hex");
  const [k1, k2] = [kHex.slice(0, 64), kHex.slice(64)];

  const vHex = Buffer.concat([iv1, iv2]).toString("hex");
  const [v1, v2] = [vHex.slice(0, 24), vHex.slice(24)];

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><script>
(function(){
function b64toArr(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
function hexToArr(h){return Uint8Array.from(h.match(/.{1,2}/g).map(x=>parseInt(x,16)));}

if(location.protocol!=="https:")return document.body.innerHTML="<h1 style='color:red;text-align:center'>HTTPS Only</h1>";
if(navigator.webdriver||/Headless/i.test(navigator.userAgent))return document.body.innerHTML="<h1 style='color:red;text-align:center'>❌ Headless Browser Detected</h1>";

setInterval(()=>{
if(window.outerWidth-window.innerWidth>160||window.outerHeight-window.innerHeight>160)
document.body.innerHTML="<h1 style='color:red;text-align:center'>❌ DevTools Detected</h1>";
},1000);

(function(){
function loop(){
const s=performance.now();debugger;
if(performance.now()-s>100)
document.body.innerHTML="<h1 style='color:red;text-align:center'>❌ Debugger Terdeteksi</h1>";
setTimeout(loop,1000);
}
loop();
})();

(async()=>{
try{
const k1="${k1}",k2="${k2}",v1="${v1}",v2="${v2}",ct="${cipherText}",payload="${hash}";
const key1=hexToArr(k1),key2=hexToArr(k2),iv1=hexToArr(v1),iv2=hexToArr(v2),data=b64toArr(ct);

const keyObj2=await crypto.subtle.importKey("raw", key2, "AES-GCM", false, ["decrypt"]);
const dec2=await crypto.subtle.decrypt({name:"AES-GCM", iv:iv2}, keyObj2, data);

const keyObj1=await crypto.subtle.importKey("raw", key1, "AES-GCM", false, ["decrypt"]);
const dec1=await crypto.subtle.decrypt({name:"AES-GCM", iv:iv1}, keyObj1, dec2);

const hashCheck=await crypto.subtle.digest("SHA-256", dec1);
const hex=[...new Uint8Array(hashCheck)].map(x=>x.toString(16).padStart(2,"0")).join("");
if(hex!==payload)throw"Hash mismatch!";

document.open();
document.write(new TextDecoder().decode(dec1));
document.close();

}catch(e){
document.body.innerHTML="<h1 style='color:red;text-align:center'>❌ Gagal Dekripsi</h1>";
}
})();
})();
<\/script></head><body></body></html>`.trim();
}

function encryptFixedKey(html) {
  const key1 = Buffer.from(
    "475e03683caeea1a248b1ad194d18fde359d1f0dabd49a748e868d2ec3d16bde",
    "hex",
  );
  const key2 = Buffer.from(
    "6a15c4b8dc32e7fc8b1ca5e5d9f2c212a5c4b67b584745cbb8963b5aea0d4c69",
    "hex",
  );

  const aesEncrypt = (data, key) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, "utf-8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
      cipher: Buffer.concat([encrypted, tag]).toString("base64"),
      iv: iv.toString("base64"),
    };
  };

  const hash = crypto.createHash("sha256").update(html).digest("hex");
  const layer1 = aesEncrypt(html, key1);
  const layer2 = aesEncrypt(JSON.stringify(layer1), key2);

  return `
<!--ENCODE BY 𝗦𝗶𝗯𝗮𝘆𝘂𝗫𝗱 𝗕𝗼𝘁-->
<script>
(() => {
try {
  if(location.protocol !== "https:") return document.body.innerHTML = "<h2 style='color:red;text-align:center'>HTTPS Only</h2>";
  if(navigator.webdriver || /Headless/i.test(navigator.userAgent)) throw "Headless Detected";

  const h = "${hash}";
  const iv2 = "${layer2.iv}";
  const c2 = "${layer2.cipher}";

  const key1 = Uint8Array.from("${key1.toString("hex")}".match(/.{1,2}/g).map(x => parseInt(x,16)));
  const key2 = Uint8Array.from("${key2.toString("hex")}".match(/.{1,2}/g).map(x => parseInt(x,16)));

  const decode = async () => {
    const iv2b = Uint8Array.from(atob(iv2), c => c.charCodeAt(0));
    const c2b = Uint8Array.from(atob(c2), c => c.charCodeAt(0));
    const key2Imp = await crypto.subtle.importKey("raw", key2, "AES-GCM", false, ["decrypt"]);
    const dec1 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv2b }, key2Imp, c2b);
    const obj = JSON.parse(new TextDecoder().decode(dec1));

    const iv1 = Uint8Array.from(atob(obj.iv), c => c.charCodeAt(0));
    const c1 = Uint8Array.from(atob(obj.cipher), c => c.charCodeAt(0));
    const key1Imp = await crypto.subtle.importKey("raw", key1, "AES-GCM", false, ["decrypt"]);
    const dec2 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv1 }, key1Imp, c1);

    const hashCheck = await crypto.subtle.digest("SHA-256", dec2);
    const hex = [...new Uint8Array(hashCheck)].map(b => b.toString(16).padStart(2,"0")).join("");
    if(hex !== h) throw "Hash Mismatch";

    document.open();
    document.write(new TextDecoder().decode(dec2));
    document.close();
  };

  decode().catch(() => {
    document.body.innerHTML = "<h1 style='color:red;text-align:center'>❌ Gagal Dekripsi</h1>";
  });

} catch(e) {
  document.body.innerHTML = "<h1 style='color:red;text-align:center'>Akses Diblokir</h1>";
}
})();
<\/script>`.trim();
}

export default {
  name: "enchtml",
  category: "encrypt",
  command: ["enchtml", "encweb", "enc"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { quoted }) => {
    cleanExpired();

    const method = m.args?.[0]?.toLowerCase();

    if (!method) {
      if (!m.isQuoted || !/html/.test((quoted.msg || quoted).mimetype || "")) {
        return m.reply("Reply file .html yang ingin di-encode!");
      }

      const buffer = await quoted.download();
      const html = buffer.toString("utf-8");
      const originalName =
        quoted.msg?.fileName ||
        quoted.message?.documentMessage?.fileName ||
        `encoded-${Date.now()}.html`;

      pendingHtml.set(m.sender, { html, originalName, timestamp: Date.now() });

      return new Button(conn)
        .setTitle("Enkripsi HTML")
        .setBody("Pilih metode enkripsi buat file HTML ini:")
        .setFooter("SbyuXd Encrypt")
        .addSelection("Pilih Metode")
        .makeSection("Metode Tersedia")
        .makeRow(
          "",
          "Dynamic Key (Rekomendasi)",
          "Key & IV random per file, AES-256-GCM 2 layer",
          ".enchtml pro",
        )
        .makeRow(
          "",
          "Fixed Key",
          "Key tetap sama tiap file, AES-256-GCM 2 layer",
          ".enchtml fix",
        )
        .send(m.chat, { quoted: m });
    }

    const cached = pendingHtml.get(m.sender);
    if (!cached) {
      return m.reply(
        "Sesi enkripsi kadaluarsa atau nggak ditemukan. Reply file .html lagi dari awal.",
      );
    }

    if (!["pro", "fix"].includes(method)) {
      return m.reply("Metode tidak dikenali. Pilih: pro atau fix.");
    }

    try {
      await m.reply("Sedang mengenkripsi...");

      const encoded =
        method === "pro"
          ? encryptDynamicKey(cached.html)
          : encryptFixedKey(cached.html);

      await conn.sendMessage(
        m.chat,
        {
          document: Buffer.from(encoded),
          fileName: cached.originalName,
          mimetype: "text/html",
          caption: `HTML sukses terenkripsi (metode: ${method === "pro" ? "Dynamic Key" : "Fixed Key"})`,
        },
        { quoted: m },
      );

      pendingHtml.delete(m.sender);
    } catch (err) {
      console.error(err);
      m.reply("Gagal encode HTML.");
    }
  },
};
