export default {
  name: "cuaca",
  category: "info",
  command: ["cuaca", "weather"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { Func }) => {
    try {
      const kota = m.text.trim();
      if (!kota) return m.reply("Masukkan nama kota.\nContoh: .cuaca Jakarta");

      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const url = `https://wttr.in/${encodeURIComponent(kota)}?format=j1`;
      const data = await Func.fetchJson(url);

      if (!data || !data.current_condition)
        return m.reply("Kota tidak ditemukan.");

      const cur = data.current_condition[0];
      const area = data.nearest_area[0];
      const today = data.weather[0];
      const tomorrow = data.weather[1];
      const lusa = data.weather[2];

      const namaKota = area.areaName[0].value;
      const negara = area.country[0].value;
      const region = area.region[0].value;

      const desc = cur.lang_id?.[0]?.value || cur.weatherDesc[0].value;

      const windDir = cur.winddir16Point;
      const uvIndex = cur.uvIndex;
      const visibility = cur.visibility;
      const humidity = cur.humidity;
      const feels = cur.FeelsLikeC;
      const temp = cur.temp_C;
      const tempMax = today.maxtempC;
      const tempMin = today.mintempC;
      const windSpeed = cur.windspeedKmph;
      const pressure = cur.pressure;
      const cloudCover = cur.cloudcover;
      const dewPoint = cur.DewPointC;
      const precip = cur.precipMM;

      const formatDay = (w) => {
        const d = new Date(w.date);
        const hari = [
          "Minggu",
          "Senin",
          "Selasa",
          "Rabu",
          "Kamis",
          "Jumat",
          "Sabtu",
        ][d.getDay()];
        const desc =
          w.hourly[4]?.lang_id?.[0]?.value ||
          w.hourly[4]?.weatherDesc[0].value ||
          "-";
        return `${hari} (${w.date})\n  Cuaca: ${desc}\n  Suhu: ${w.mintempC}°C - ${w.maxtempC}°C\n  Hujan: ${w.hourly.reduce((a, h) => a + parseFloat(h.precipMM), 0).toFixed(1)} mm`;
      };

      const teks = `
*Cuaca ${namaKota}, ${region}, ${negara}*

*Kondisi Saat Ini*
Cuaca     : ${desc}
Suhu      : ${temp}°C (Terasa ${feels}°C)
Maks/Min  : ${tempMax}°C / ${tempMin}°C
Kelembapan: ${humidity}%
Titik Embun: ${dewPoint}°C
Tekanan   : ${pressure} hPa
Tutupan Awan: ${cloudCover}%
Jarak Pandang: ${visibility} km
Curah Hujan: ${precip} mm
Angin     : ${windSpeed} km/h arah ${windDir}
Indeks UV : ${uvIndex}

*Prakiraan 3 Hari*
${formatDay(today)}

${formatDay(tomorrow)}

${formatDay(lusa)}
`.trim();

      await conn.sendMessage(m.chat, { text: teks }, { quoted: m });
      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await m.reply("Error: " + e.message);
    }
  },
};
