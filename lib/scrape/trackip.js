export async function trackIp(ip) {
  if (!ip || typeof ip !== "string") throw new Error("IP address atau domain wajib diisi.");

  const cleanIp = ip.trim().replace(/^https?:\/\//, "").split("/")[0];

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}`);
    const data = await response.json();

    if (data && data.success) {
      return {
        ip: data.ip,
        type: data.type,
        continent: data.continent,
        country: data.country,
        countryCode: data.country_code,
        region: data.region,
        city: data.city,
        postal: data.postal,
        latitude: data.latitude,
        longitude: data.longitude,
        callingCode: data.calling_code,
        capital: data.capital,
        timezone: data.timezone?.id,
        timeCurrent: data.timezone?.current_time,
        isp: data.connection?.isp,
        org: data.connection?.org,
        asn: data.connection?.asn,
        domain: data.connection?.domain,
        isProxy: data.security?.proxy || false,
        isVpn: data.security?.vpn || false,
        isTor: data.security?.tor || false,
        isHosting: data.security?.hosting || false
      };
    }
  } catch {}

  const resApi = await fetch(`http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=status,message,continent,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query,proxy,hosting`);
  const apiData = await resApi.json();

  if (!apiData || apiData.status !== "success") {
    throw new Error(apiData?.message || "IP address atau domain tidak ditemukan.");
  }

  return {
    ip: apiData.query,
    type: apiData.query.includes(":") ? "IPv6" : "IPv4",
    continent: apiData.continent,
    country: apiData.country,
    countryCode: apiData.countryCode,
    region: apiData.regionName,
    city: apiData.city,
    postal: apiData.zip,
    latitude: apiData.lat,
    longitude: apiData.lon,
    callingCode: "-",
    capital: "-",
    timezone: apiData.timezone,
    timeCurrent: "-",
    isp: apiData.isp,
    org: apiData.org,
    asn: apiData.as,
    domain: "-",
    isProxy: apiData.proxy || false,
    isVpn: false,
    isTor: false,
    isHosting: apiData.hosting || false
  };
}