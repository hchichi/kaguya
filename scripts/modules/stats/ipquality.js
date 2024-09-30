const NAME = 'ipquality'
const $ = new Env(NAME)

let arg = {}
//let $argument = 'checkOpenAI=true'; 
if (typeof $argument != 'undefined') {
  arg = Object.fromEntries($argument.split('&').map(item => item.split('=')))
}

const DEFAULT_ARGS = {
  checkOpenAI: true,
  timeout: 3,
  icon: 'network.slash',
  iconColor: '#006a4e',
  notify: false
}

arg = {...DEFAULT_ARGS, ...arg}

arg.checkOpenAI = arg.checkOpenAI === 'true'
arg.notify = arg.notify === 'true'
arg.timeout = parseInt(arg.timeout, 10)

$.log(`处理后的参数: ${JSON.stringify(arg)}`)

let result = {}

// 修改后的主函数部分
!(async () => {
  let [info, chatStatus] = await Promise.all([getInfo(), checkOpenAI()]);

  $.log(JSON.stringify(info));

  let geoConsistency = info.maxmind?.geoConsistency || 'undefined';
  let contentArray;
  //if (arg.checkOpenAI) {
  //  contentArray = [
  //    `${info.maxmind?.geoConsistency === 'GeoConsistent' ? 'Native IP:' : 'Broadcast IP:'} ${info.ipv4 || '-'}`,
  //    `GPT IP: ${chatStatus.ip || ''}`,
  //    `GEO: ${getFlagEmoji(info.maxmind?.countrycode)} ${info.maxmind?.country || 'undefined'}${info.maxmind?.city ? ' | ' + info.maxmind?.city : ''}`,
  //    `ASN: ${info.maxmind?.asn || 'undefined'} | ${info.maxmind?.org || 'undefined'}`,
  //    //`REP: ${info.usageType === 'undefined' ? '' : info.usageType + ' | '}${info.riskLevel} - Trust Score is ${info.score}.`,
  //    `REP: ${info.usageType === 'undefined' ? '' : info.usageType + ' | '}${info.riskLevel} - Trust Score is ${info.score === null ? 'N/A' : info.score}.`
  //    `Done: Test completed at ${new Date().toTimeString().split(' ')[0]}`
  //  ];
  //} else {
  //  contentArray = [
  //    `${info.maxmind?.geoConsistency === 'GEO' ? 'Native IP:' : 'Broadcast IP:'} ${info.ipv4 || '-'}`,
  //    `GEO: ${getFlagEmoji(info.maxmind?.countrycode)} ${info.maxmind?.country || 'undefined'}${info.maxmind?.city ? ' | ' + info.maxmind?.city : ''}`,
  //    `ASN: ${info.maxmind?.asn || 'undefined'} | ${info.maxmind?.org || 'undefined'}`,
  //    `REP: ${info.usageType === 'undefined' ? '' : info.usageType + ' | '}${info.riskLevel} - Trust Score is ${info.score}.`,
  //    `Done: Test completed at ${new Date().toTimeString().split(' ')[0]}`
  //  ];
  //}  

  if (arg.checkOpenAI) {
    contentArray = [
      `${info.maxmind?.geoConsistency === 'Geo-consistent' ? '🏠' : '📡'} ${info.ipv4 || '-'}`,
      `🤖 ${chatStatus.ip || ''}`,
      //`🌍 ${info.maxmind?.city ? info.maxmind?.city + ', ' : ''}${info.maxmind?.country || 'undefined'} ${getFlagEmoji(info.maxmind?.countrycode)}`,
      `🌍 ${info.maxmind?.city ? info.maxmind?.city + ', ' : ''}${info.maxmind?.subcode ? info.maxmind?.subcode + ', ' + info.maxmind?.countrycode : info.maxmind?.country || 'undefined'} ${getFlagEmoji(info.maxmind?.countrycode)}`,
      `🕸️ ${info.maxmind?.asn || 'undefined'} | ${info.maxmind?.org || 'undefined'}`,
      //`🔍 ${info.usageType || 'undefined'} | ${info.riskLevel || 'undefined'} - Trust Score is ${info.score === null ? 'N/A' : info.score}`,
      `🔍 ${info.usageType || 'undefined'} | ${info.riskLevel || '[Low]'} - Trust Score is ${info.score === null ? 'N/A' : info.score}`,
      `⏱️ ${new Date().toTimeString().split(' ')[0]}`
    ];
  } else {
    contentArray = [
      `${info.maxmind?.geoConsistency === 'Geo-consistent' ? '🏠' : '📡'} ${info.ipv4 || '-'}`,
      //`🌍 ${info.maxmind?.city ? info.maxmind?.city + ', ' : ''}${info.maxmind?.country || 'undefined'} ${getFlagEmoji(info.maxmind?.countrycode)}`,
      `🌍 ${info.maxmind?.city ? info.maxmind?.city + ', ' : ''}${info.maxmind?.subcode ? info.maxmind?.subcode + ', ' + info.maxmind?.countrycode : info.maxmind?.country || 'undefined'} ${getFlagEmoji(info.maxmind?.countrycode)}`,
      `🕸️ ${info.maxmind?.asn || 'undefined'} | ${info.maxmind?.org || 'undefined'}`,
      //`🔍 ${info.usageType || 'undefined'} | ${info.riskLevel || 'undefined'} - Trust Score is ${info.score}`,
      `🔍 ${info.usageType || 'undefined'} | ${info.riskLevel || '[Low]'} - Trust Score is ${info.score === null ? 'N/A' : info.score}`,

      `⏱️ ${new Date().toTimeString().split(' ')[0]}`
    ];
  }
  
  let content = contentArray.filter(item => item).join('\n');

  let title;
  if (arg.checkOpenAI) {
    title = chatStatus.status;
    title = `${geoConsistency}: ${getFlagEmoji(info.maxmind?.regcountrycode || info.maxmind?.countrycode)} ${info.maxmind?.regcountry || info.maxmind?.country}`;
    title += `\n${chatStatus.status}`;
  } else {
    title = `${geoConsistency}: ${getFlagEmoji(info.maxmind?.regcountrycode || info.maxmind?.countrycode)} ${info.maxmind?.regcountry || info.maxmind?.country}`;
  }  

  if (arg.notify) {
    await notify(NAME, title, content);
  }

  result = {
    title,
    content,
    icon: arg.icon,
    'icon-color': arg.iconColor
  };
})()

.catch(async e => {
  $.logErr(e);
  const msg = `${$.lodash_get(e, 'message') || $.lodash_get(e, 'error') || e}`;
  result = {
    title: '❌ Error',
    content: msg,
    icon: arg.icon,
    'icon-color': arg.iconColor
  };
  if (arg.notify) {
    await notify(NAME, result.title, result.content);
  }
})
.finally(async () => {
  $.log(JSON.stringify(result));
  $.done(result);
});

async function getInfo() {
  let ipv4 = '';
  let ipv6 = '';
  let info = {};
  
  try {
    const getIP = async (url) => {
      try {
        const res = await $.http.get({
          url,
          timeout: arg.timeout * 1000
        });
        return JSON.parse(res.body).ip;
      } catch (err) {
        $.log(`获取 IP 地址失败 (${url}): ${err.message}`);
        return null;
      }
    };
  
    const [ipv4Result, ipv6Result] = await Promise.allSettled([
      getIP('https://ipv4.jsonip.com'),
      getIP('https://ipv6.jsonip.com')
    ]);
  
    ipv4 = ipv4Result.status === 'fulfilled' ? ipv4Result.value : '';
    ipv6 = ipv6Result.status === 'fulfilled' ? ipv6Result.value : '';
  
    if (ipv4) {
      $.log(`获取到的 IPv4 地址: ${ipv4}`);
    }
    if (ipv6) {
      $.log(`获取到的 IPv6 地址: ${ipv6}`);
    }

    if (ipv4) {
      // 并行处理多个 API 请求
      const apiRequests = [
        fetchMaxmindData(ipv4),
        fetchIpregistryData(ipv4),
        fetchAbuseipdbData(ipv4),
        fetchIpqualityscoreData(ipv4),
<<<<<<< HEAD
        fetchDbIpData(ipv4),
        fetchIpapiData(ipv4)
=======
        fetchDbIpData(ipv4)
>>>>>>> 52c0162dedc816668a91d18d358120999b39b247
      ];

      const results = await Promise.all(apiRequests);

      // 合并结果
      results.forEach(result => {
        if (result) {
          Object.assign(info, result);
        }
      });

<<<<<<< HEAD
      // 如果 ipinfo.check.place 相关 API 全部失效，使用 DB-IP 和 IPAPI 的数据
      if (!info.maxmind && !info.ipregistry && !info.abuseipdb && !info.ipqs) {
        info.maxmind = {
          asn: info.dbip?.asn || `AS${info.ipapi?.asn?.asn}`,
          org: info.ipapi?.asn?.org,
          city: info.dbip?.city || info.ipapi?.location?.city,
          countrycode: info.dbip?.countrycode || info.ipapi?.location?.country_code,
          country: info.dbip?.country || info.ipapi?.location?.country,
          geoConsistency: info.ipapi?.asn?.country === info.ipapi?.location?.country_code ? 'Geo-consistent' : 'Geo-discrepant'
        };
      }
=======
      // // 获取最差的风险等级和最高评分
      // const scores = [
      //   info.abuseipdb?.score || 0,
      //   info.ipqs?.score || 0,
      //   info.dbip?.risk || 0
      // ];
// 
      // const reputationInfo = {
      //   usageType: getUsageType(info.abuseipdb?.usetype),
      //   riskLevel: getWorstRiskLevel(scores),
      //   score: Math.max(...scores)
      // };
>>>>>>> 52c0162dedc816668a91d18d358120999b39b247

      const scores = [    
        info.abuseipdb?.score || 0,
        info.ipqs?.score || 0,
        info.dbip?.risk || 0
      ];
      
      const { level, score } = getWorstRiskLevel(scores);
      
      const reputationInfo = {
<<<<<<< HEAD
        usageType: getUsageType(info.abuseipdb?.usetype || info.ipapi?.company?.type),
        riskLevel: level,
        score: score
      };
=======
        usageType: getUsageType(info.abuseipdb?.usetype),
        riskLevel: level,
        score: score
      };
       

>>>>>>> 52c0162dedc816668a91d18d358120999b39b247

      // 将声誉信息合并到 info 对象中
      Object.assign(info, reputationInfo);
    }
  } catch (e) {
    $.logErr(e);
    $.logErr($.toStr(e));
  }

  info.ipv4 = ipv4;
  info.ipv6 = ipv6;
  return info;
}

async function fetchMaxmindData(ip) {
  try {
    const res = await $.http.get({
      url: `https://ipinfo.check.place/${ip}?lang=en`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: arg.timeout * 1000
    });
    const data = JSON.parse(res.body);
    $.log(`Maxmind 数据获取成功`);

    const maxmind = {
      //asn: data.ASN.AutonomousSystemNumber,
      asn: `AS${data.ASN.AutonomousSystemNumber}`,
      org: data.ASN.AutonomousSystemOrganization,
      city: data.City.Name,
      post: data.City.PostalCode,
      lat: data.City.Latitude,
      lon: data.City.Longitude,
      rad: data.City.AccuracyRadius,
      continentcode: data.City.Continent.Code,
      continent: data.City.Continent.Name,
      citycountrycoad: data.City.Country.IsoCode,
      citycountry: data.City.Country.Name,
      timezone: data.City.Location.TimeZone,
      subcode: data.City.Subdivisions.length > 0 ? data.City.Subdivisions[0].IsoCode : 'N/A',
      sub: data.City.Subdivisions.length > 0 ? data.City.Subdivisions[0].Name : 'N/A',
      countrycode: data.Country.IsoCode,
      country: data.Country.Name,
      regcountrycode: data.Country.RegisteredCountry.IsoCode,
      regcountry: data.Country.RegisteredCountry.Name
    };

    // 对比 regcountrycode 和 countrycode
    maxmind.geoConsistency = maxmind.regcountrycode === maxmind.countrycode ? 'Geo-consistent' : 'Geo-discrepant';
    
    return { maxmind };
  } catch (err) {
    $.log(`Maxmind 数据获取失败: ${err.message}`);
    return null;
  }
}

async function fetchIpregistryData(ip) {
  try {
    const res = await $.http.get({
      url: `https://ipinfo.check.place/${ip}?db=ipregistry`,
      timeout: arg.timeout * 1000
    });
    const data = JSON.parse(res.body);
    $.log(`ipregistry 数据获取成功`);

    const ipregistry = {
      usetype: data.connection.type,
      comtype: data.company.type,
      countrycode: data.location.country.code,
      proxy: data.security.is_proxy,
      tor1: data.security.is_tor,
      tor2: data.security.is_tor_exit,
      tor: data.security.is_tor || data.security.is_tor_exit,
      vpn: data.security.is_vpn,
      server: data.security.is_cloud_provider,
      abuser: data.security.is_abuser
    };

    return { ipregistry };
  } catch (err) {
    $.log(`ipregistry 数据获取失败: ${err.message}`);
    return null;
  }
}

async function fetchAbuseipdbData(ip) {
  try {
    const res = await $.http.get({
      url: `https://ipinfo.check.place/${ip}?db=abuseipdb`,
      timeout: arg.timeout * 1000
    });
    const data = JSON.parse(res.body);
    $.log(`AbuseIPDB 数据获取成功`);

    const abuseipdb = {
      usetype: data.data.usageType,
      score: data.data.abuseConfidenceScore
    };

    return { abuseipdb };
  } catch (err) {
    $.log(`AbuseIPDB 数据获取失败: ${err.message}`);
    return null;
  }
}


async function fetchIpqualityscoreData(ip) {
  try {
    const res = await $.http.get({
      url: `https://ipinfo.check.place/${ip}?db=ipqualityscore`,
      timeout: arg.timeout * 1000
    });
    const data = JSON.parse(res.body);
    $.log(`IPQualityScore 数据获取成功`);

    const ipqs = {
      score: data.fraud_score,
      countrycode: data.country_code,
      proxy: data.proxy,
      tor: data.tor,
      vpn: data.vpn,
      abuser: data.recent_abuse,
      robot: data.bot_status
    };

    return { ipqs };
  } catch (err) {
    $.log(`IPQualityScore 数据获取失败: ${err.message}`);
    return null;
  }
}


async function fetchDbIpData(ip) {
  try {
    const res = await $.http.get({
      url: `https://db-ip.com/demo/home.php?s=${ip}`,
      timeout: arg.timeout * 1000
    });
    const data = JSON.parse(res.body);
    $.log(`DB-IP 数据获取成功`);

    const dbip = {
      risk: data.demoInfo.threatLevel,
      countrycode: data.country_code,
      asn: data.asn
    };

    return { dbip };
  } catch (err) {
    $.log(`DB-IP 数据获取失败: ${err.message}`);
    return null;
  }
}

<<<<<<< HEAD
async function fetchIpapiData(ip) {
  try {
    const res = await $.http.get({
      url: `https://api.ipapi.is/?ip=${ip}`,
      timeout: arg.timeout * 1000
    });
    const data = JSON.parse(res.body);
    $.log(`IPAPI 数据获取成功`);

    const ipapi = {
      asn: data.asn,
      company: data.company,
      location: data.location
    };

    return { ipapi };
  } catch (err) {
    $.log(`IPAPI 数据获取失败: ${err.message}`);
    return null;
  }
}
=======
>>>>>>> 52c0162dedc816668a91d18d358120999b39b247

const usageTypeMap = {
  'Data Center/Web Hosting/Transit': 'Hosting',
  'Fixed Line ISP': 'ISP',
  'Mobile ISP': 'Mobile ISP',
  'Company': 'Corporate',
  'Content Delivery Network': 'CDN',
  'Search Engine Spider': 'Search Engine',
  'Educational/School': 'Education',
  'Government': 'Government',
  'Unknown': 'Unknown'
  // 可以根据需要添加更多的映射关系
};

function getUsageType(usageType) {
  return usageTypeMap[usageType] || usageType || 'undefined';
}

function getWorstRiskLevel(scores) {
  let worstLevel = "[Low]";
  let worstScore = 0;

  for (const score of scores) {
    if (score >= 90) {
      return { level: "[Critical]", score };
    } else if (score >= 85) {
      worstLevel = "[High Risk]";
      worstScore = Math.max(worstScore, score);
    } else if (score >= 75) {
      if (worstLevel !== "[High Risk]") {
        worstLevel = "[High]";
        worstScore = Math.max(worstScore, score);
      }
    } else if (score >= 25) {
      if (worstLevel !== "[High Risk]" && worstLevel !== "[High]") {
        worstLevel = "[Suspicious]";
        worstScore = Math.max(worstScore, score);
      }
    }
  }

  return { level: worstLevel, score: worstScore };
}





// 通知
async function notify(title, subt, desc, opts) {
  if (arg.notify) {
    $.msg(title, subt, desc, opts);
  } else {
    $.log('🔕', title, subt, desc, opts);
  }
}

function getFlagEmoji(code) {
  if (code) {
    const codePoints = [...code.toUpperCase()].map(c => c.codePointAt() + 127397);
    return String.fromCodePoint(...codePoints);
  }
  return '';
}

async function checkOpenAI() {
  if (arg.checkOpenAI !== true) {
    $.log('CheckOpenAI: arg.checkOpenAI is false, skipping check');
    return {
      status: '',
      ip: ''
    };
  }

  const SUPPORT_COUNTRY = ["AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ", "BS", "BD", "BB", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR", "BN", "BG", "BF", "CV", "CA", "CL", "CO", "KM", "CG", "CR", "CI", "HR", "CY", "CZ", "DK", "DJ", "DM", "DO", "EC", "SV", "EE", "FJ", "FI", "FR", "GA", "GM", "GE", "DE", "GH", "GR", "GD", "GT", "GN", "GW", "GY", "HT", "VA", "HN", "HU", "IS", "IN", "ID", "IQ", "IE", "IL", "IT", "JM", "JP", "JO", "KZ", "KE", "KI", "KW", "KG", "LV", "LB", "LS", "LR", "LI", "LT", "LU", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM", "MD", "MC", "MN", "ME", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PL", "PT", "QA", "RO", "RW", "KN", "LC", "VC", "WS", "SM", "ST", "SN", "RS", "SC", "SL", "SG", "SK", "SI", "SB", "ZA", "KR", "ES", "LK", "SR", "SE", "CH", "TW", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR", "TV", "UG", "UA", "AE", "GB", "US", "UY", "VU", "ZM"];
  const timeout = arg.timeout * 1000;

  try {
    const [traceRes, apiRes, iosRes] = await Promise.all([
      $.http.get({
        url: "https://chat.openai.com/cdn-cgi/trace",
        timeout
      }),
      $.http.get({
        url: "https://api.openai.com/compliance/cookie_requirements",
        headers: {
          'authority': 'api.openai.com',
          'accept': '*/*',
          'accept-language': 'zh-CN,zh;q=0.9',
          'authorization': 'Bearer null',
          'content-type': 'application/json',
          'origin': 'https://platform.openai.com',
          'referer': 'https://platform.openai.com/',
          'sec-ch-ua': '"Microsoft Edge";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0'
        },
        timeout
      }),
      $.http.get({
        url: "https://ios.chat.openai.com/",
        headers: {
          'authority': 'ios.chat.openai.com',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'accept-language': 'zh-CN,zh;q=0.9',
          'sec-ch-ua': '"Microsoft Edge";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': '1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0'
        },
        timeout
      })
    ]);

    $.log('CheckOpenAI: traceRes:', traceRes);
    $.log('CheckOpenAI: apiRes:', apiRes);
    $.log('CheckOpenAI: iosRes:', iosRes);

    const traceInfo = traceRes.body.trim().split('\n').reduce((obj, line) => {
      const [key, value] = line.split('=');
      obj[key] = value;
      return obj;
    }, {});

    const loc = traceInfo.loc;
    const ip = traceInfo.ip;

    const apiResult = apiRes.body;
    const iosResult = iosRes.body;

    $.log('CheckOpenAI: loc:', loc);
    $.log('CheckOpenAI: ip:', ip);
    $.log('CheckOpenAI: apiResult:', apiResult);
    $.log('CheckOpenAI: iosResult:', iosResult);

    const unsupportedCountry = apiResult.includes("unsupported_country");
    const vpnDetected = iosResult.includes("VPN");

    $.log('CheckOpenAI: unsupportedCountry:', unsupportedCountry);
    $.log('CheckOpenAI: vpnDetected:', vpnDetected);

    let status, region, type;

    if (!unsupportedCountry && !vpnDetected) {
      status = "🟢";
      region = `  [${loc}]   `;
      //type = SUPPORT_COUNTRY.includes(loc) ? "支持" : "不支持";
      type = SUPPORT_COUNTRY.includes(loc) ? "✔️" : "〤";
    } else if (unsupportedCountry && vpnDetected) {
      //status = "🔴";
      //region = "未知";
      //type = "未知";
      status = "⛔️";
      region = "❓";
      type = "❓";
    } else if (!unsupportedCountry && vpnDetected) {
      status = "🟡";
      region = `  [${loc}]   `;
      //type = SUPPORT_COUNTRY.includes(loc) ? "支持" : "不支持";
      type = SUPPORT_COUNTRY.includes(loc) ? "✔️" : "〤";
    } else if (unsupportedCountry && !vpnDetected) {
      status = "🟠";
      region = `  [${loc}]   `;
      //type = SUPPORT_COUNTRY.includes(loc) ? "支持" : "不支持";
      type = SUPPORT_COUNTRY.includes(loc) ? "✔️" : "〤";
    } else {
      //status = "❓";
      //region = "未知";
      //type = "未知";
      status = "❓";
      region = "❓";
      type = "❓";
    }

    $.log('CheckOpenAI: status:', status);
    $.log('CheckOpenAI: region:', region);
    $.log('CheckOpenAI: type:', type);

    const result = {
      //status: `CGPT: ${status} | ${getFlagEmoji(loc)} ${loc}`,
      status: `OpenAI: ${status} ➬ ${getFlagEmoji(loc)} ${loc}`,

      ip: ip
    };

    $.log('CheckOpenAI: result:', JSON.stringify(result));

    return result;
  } catch (error) {
    $.log('CheckOpenAI: error:', error);

    const result = {
      status: "OpenAI: ❌",
      ip: ' - '
    };

    $.log('CheckOpenAI: error result:', JSON.stringify(result));

    return result;
  }
}




// prettier-ignore
function Env(t,s){class e{constructor(t){this.env=t}send(t,s="GET"){t="string"==typeof t?{url:t}:t;let e=this.get;return"POST"===s&&(e=this.post),new Promise((s,i)=>{e.call(this,t,(t,e,r)=>{t?i(t):s(e)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,s){this.name=t,this.http=new e(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,s),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $environment&&$environment["surge-version"]}isLoon(){return"undefined"!=typeof $loon}isShadowrocket(){return"undefined"!=typeof $rocket}isStash(){return"undefined"!=typeof $environment&&$environment["stash-version"]}toObj(t,s=null){try{return JSON.parse(t)}catch{return s}}toStr(t,s=null){try{return JSON.stringify(t)}catch{return s}}getjson(t,s){let e=s;const i=this.getdata(t);if(i)try{e=JSON.parse(this.getdata(t))}catch{}return e}setjson(t,s){try{return this.setdata(JSON.stringify(t),s)}catch{return!1}}getScript(t){return new Promise(s=>{this.get({url:t},(t,e,i)=>s(i))})}runScript(t,s){return new Promise(e=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=s&&s.timeout?s.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,s,i)=>e(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s);if(!e&&!i)return{};{const i=e?t:s;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s),r=JSON.stringify(this.data);e?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(s,r):this.fs.writeFileSync(t,r)}}lodash_get(t,s,e){const i=s.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return e;return r}lodash_set(t,s,e){return Object(t)!==t?t:(Array.isArray(s)||(s=s.toString().match(/[^.[\]]+/g)||[]),s.slice(0,-1).reduce((t,e,i)=>Object(t[e])===t[e]?t[e]:t[e]=Math.abs(s[i+1])>>0==+s[i+1]?[]:{},t)[s[s.length-1]]=e,t)}getdata(t){let s=this.getval(t);if(/^@/.test(t)){const[,e,i]=/^@(.*?)\.(.*?)$/.exec(t),r=e?this.getval(e):"";if(r)try{const t=JSON.parse(r);s=t?this.lodash_get(t,i,""):s}catch(t){s=""}}return s}setdata(t,s){let e=!1;if(/^@/.test(s)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(s),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const s=JSON.parse(h);this.lodash_set(s,r,t),e=this.setval(JSON.stringify(s),i)}catch(s){const o={};this.lodash_set(o,r,t),e=this.setval(JSON.stringify(o),i)}}else e=this.setval(t,s);return e}getval(t){return this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,s){return this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$persistentStore.write(t,s):this.isQuanX()?$prefs.setValueForKey(t,s):this.isNode()?(this.data=this.loaddata(),this.data[s]=t,this.writedata(),!0):this.data&&this.data[s]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,s=(()=>{})){if(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status?e.status:e.statusCode,e.status=e.statusCode),s(t,e,i)});else if(this.isQuanX())this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:r,body:o}=t;s(null,{status:e,statusCode:i,headers:r,body:o},o)},t=>s(t&&t.error||"UndefinedError"));else if(this.isNode()){let e=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,s)=>{try{if(t.headers["set-cookie"]){const e=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();e&&this.ckjar.setCookieSync(e,null),s.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:r,headers:o,rawBody:h}=t,a=e.decode(h,this.encoding);s(null,{status:i,statusCode:r,headers:o,rawBody:h,body:a},a)},t=>{const{message:i,response:r}=t;s(i,r,r&&e.decode(r.rawBody,this.encoding))})}}post(t,s=(()=>{})){const e=t.method?t.method.toLocaleLowerCase():"post";if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[e](t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status?e.status:e.statusCode,e.status=e.statusCode),s(t,e,i)});else if(this.isQuanX())t.method=e,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:r,body:o}=t;s(null,{status:e,statusCode:i,headers:r,body:o},o)},t=>s(t&&t.error||"UndefinedError"));else if(this.isNode()){let i=require("iconv-lite");this.initGotEnv(t);const{url:r,...o}=t;this.got[e](r,o).then(t=>{const{statusCode:e,statusCode:r,headers:o,rawBody:h}=t,a=i.decode(h,this.encoding);s(null,{status:e,statusCode:r,headers:o,rawBody:h,body:a},a)},t=>{const{message:e,response:r}=t;s(e,r,r&&i.decode(r.rawBody,this.encoding))})}}time(t,s=null){const e=s?new Date(s):new Date;let i={"M+":e.getMonth()+1,"d+":e.getDate(),"H+":e.getHours(),"m+":e.getMinutes(),"s+":e.getSeconds(),"q+":Math.floor((e.getMonth()+3)/3),S:e.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(e.getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in i)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[s]:("00"+i[s]).substr((""+i[s]).length)));return t}queryStr(t){let s="";for(const e in t){let i=t[e];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),s+=`${e}=${i}&`)}return s=s.substring(0,s.length-1),s}msg(s=t,e="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()||this.isShadowrocket()||this.isStash()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let s=t.openUrl||t.url||t["open-url"],e=t.mediaUrl||t["media-url"];return{openUrl:s,mediaUrl:e}}if(this.isQuanX()){let s=t["open-url"]||t.url||t.openUrl,e=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":s,"media-url":e,"update-pasteboard":i}}if(this.isSurge()||this.isShadowrocket()||this.isStash()){let s=t.url||t.openUrl||t["open-url"];return{url:s}}}};if(this.isMute||(this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$notification.post(s,e,i,o(r)):this.isQuanX()&&$notify(s,e,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(s),e&&t.push(e),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,s){const e=!this.isSurge()||this.isShadowrocket()&&!this.isQuanX()&&!this.isLoon()&&!this.isStash();e?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(s=>setTimeout(s,t))}done(t={}){const s=(new Date).getTime(),e=(s-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${e} \u79d2`),this.log(),this.isSurge()||this.isShadowrocket()||this.isQuanX()||this.isLoon()||this.isStash()?$done(t):this.isNode()&&process.exit(1)}}(t,s)}
