import crypto from "crypto";

export default {
  name: "encweb",
  category: "encrypt",
  command: ["encpro", "encweb"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    if (
      !m.isQuoted ||
      !/html/.test((m.quoted.msg || m.quoted).mimetype || "")
    ) {
      return m.reply(`❗ Reply file .html yang ingin di-encode!`);
    }

    try {
      await m.reply("⏳ Sedang mengenkripsi dengan proteksi pro...");

      const buffer = await m.quoted.download();
      const html = buffer.toString("utf-8");

      const enc = Buffer.from(html, "utf-8");

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

      const step1 = aesEncrypt(enc, key1, iv1);
      const step2 = aesEncrypt(step1, key2, iv2);

      const hash = crypto.createHash("sha256").update(enc).digest("hex");
      const cipherText = step2.toString("base64");

      const kHex = Buffer.concat([key1, key2]).toString("hex");
      const [k1, k2] = [kHex.slice(0, 64), kHex.slice(64)];

      const vHex = Buffer.concat([iv1, iv2]).toString("hex");
      const [v1, v2] = [vHex.slice(0, 24), vHex.slice(24)];

      const encodedHTML =
        `<!DOCTYPE html><html><head><meta charset="utf-8"><script>
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

      const originalName =
        m.quoted.msg?.fileName ||
        m.quoted.message?.documentMessage?.fileName ||
        `encoded-${Date.now()}.html`;

      await conn.sendMessage(
        m.chat,
        {
          document: Buffer.from(encodedHTML),
          fileName: originalName,
          mimetype: "text/html",
          caption: `✅ HTML sukses terenkripsi.`,
        },
        { quoted: m },
      );
    } catch (err) {
      console.error(err);
      m.reply("❌ Gagal encode HTML.");
    }
  },
};
