import { trackIp } from "#scrape/trackip.js";

export default {
  name: "trackip",
  category: "tools",
  command: ["trackip", "ip", "ipinfo", "iplookup"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const text = m.text?.trim() || m.quoted?.body?.trim() || m.quoted?.text?.trim();

    if (!text) {
      return m.reply("Masukkan IP address atau domain target.\n\nContoh: *.trackip 8.8.8.8* atau *.trackip google.com*");
    }

    try {
      const res = await trackIp(text);

      const mapsUrl = `https://www.google.com/maps?q=${res.latitude},${res.longitude}`;

      const resultText =
        `*TRACK IP INFORMATION*\n\n` +
        `• *IP Address* : \`${res.ip}\`\n` +
        `• *Tipe IP* : \`${res.type}\` \n\n` +
        `*LOCATION DETAILS*\n` +
        `• *Benua* : \`${res.continent || "-"}\` \n` +
        `• *Negara* : \`${res.country || "-"} (${res.countryCode || "-"})\` \n` +
        `• *Wilayah* : \`${res.region || "-"}\` \n` +
        `• *Kota* : \`${res.city || "-"}\` \n` +
        `• *Kode Pos* : \`${res.postal || "-"}\` \n` +
        `• *Koordinat* : \`${res.latitude}, ${res.longitude}\` \n` +
        `• *Peta* : ${mapsUrl} \n\n` +
        `*NETWORK & ISP*\n` +
        `• *ISP* : \`${res.isp || "-"}\` \n` +
        `• *Organisasi* : \`${res.org || "-"}\` \n` +
        `• *ASN* : \`${res.asn || "-"}\` \n` +
        `• *Domain* : \`${res.domain || "-"}\` \n\n` +
        `*TIME & SYSTEM*\n` +
        `• *Timezone* : \`${res.timezone || "-"}\` \n` +
        `• *Waktu Lokal* : \`${res.timeCurrent || "-"}\` \n\n` +
        `*SECURITY ANALYSIS*\n` +
        `• *Proxy* : \`${res.isProxy ? "Ya" : "Tidak"}\` \n` +
        `• *VPN* : \`${res.isVpn ? "Ya" : "Tidak"}\` \n` +
        `• *TOR* : \`${res.isTor ? "Ya" : "Tidak"}\` \n` +
        `• *Hosting/Server* : \`${res.isHosting ? "Ya" : "Tidak"}\``;

      return m.reply(resultText);
    } catch (err) {
      return m.reply("Gagal melacak IP: " + err.message);
    }
  },
};