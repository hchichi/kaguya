const NAME = 'ipwhois+scamalytics'
const $ = new Env(NAME)

let arg = {}
if (typeof $argument !== 'undefined') {
  arg = Object.fromEntries($argument.split('&').map(item => item.split('=')))
}

// Set default parameters
const DEFAULT_ARGS = {
  timeout: '5',
  icon: 'network.slash',
  iconColor: '#006a4e',
  notify: 'true',
  panel_name: 'IPWhois+Scamalytics',
  update_interval: '3600'
}

// Merge input parameters with default parameters
arg = { ...DEFAULT_ARGS, ...arg }

// Convert parameter types
arg.notify = arg.notify === 'true'
arg.timeout = parseInt(arg.timeout)
arg.update_interval = parseInt(arg.update_interval)

$.log(`Input parameters: ${JSON.stringify(arg)}`)

let result = {}

; (async () => {
  try {
    const ipInfo = await getIPInfo()
    const scamalyticsInfo = await db_scamalytics(ipInfo.ip)
    const ipwhoisInfo = await db_ipwhois(ipInfo.ip)
    const domesticInfo = await db_domestic()

    let title = `${ipInfo.ip} - ${ipwhoisInfo.country}`;
    
    // 比较IP地址并设置标题
    if (domesticInfo.ip && domesticInfo.ip !== ipInfo.ip) {
      $.log(`IP不匹配: getIPInfo=${ipInfo.ip}, Ctrip=${domesticInfo.ip}`);
      title = `🔄 ${domesticInfo.ip} | ${domesticInfo.title}`;
    } else {
      title = `🌐 ${ipInfo.ip} | ${ipwhoisInfo.country}`;
    }

    const content = formatContent(ipInfo, scamalyticsInfo, ipwhoisInfo)
    const score = show_score(scamalyticsInfo)
    const factors = show_factor(ipwhoisInfo)

    result = {
      title: title,
      content: `${content}\n\n${score}\n\n${factors}`,
      icon: arg.icon,
      'icon-color': arg.iconColor
    }

    if (arg.notify) {
      await notify(NAME, result.title, result.content)
    }
  } catch (e) {
    $.logErr(e)
    const msg = `${e.message || e.error || e}`
    result = {
      title: '❌ Error',
      content: msg,
      icon: arg.icon,
      'icon-color': arg.iconColor
    }
    if (arg.notify) {
      await notify(NAME, result.title, result.content)
    }
  }
})().finally(() => {
  $.done(result)
})

// Get IP information
async function getIPInfo() {
  const res = await $.http.get({
    url: 'https://api.ip.sb/jsonip',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
    },
    timeout: arg.timeout * 1000
  })

  const ipData = JSON.parse(res.body)
  $.log(`Obtained IP: ${ipData.ip}`)

  return { ip: ipData.ip }
}

// Get Scamalytics information
async function db_scamalytics(ip) {
  const res = await $.http.get({
    url: `https://scamalytics.com/ip/${ip}`,
    headers: {
      'Referer': 'https://scamalytics.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
    },
    timeout: arg.timeout * 1000
  })

  const html = res.body
  const scoreMatch = html.match(/Fraud Score: (\d+)/)
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null

  let risk
  if (score < 25) risk = "Low Risk"
  else if (score < 50) risk = "Medium Risk"
  else if (score < 75) risk = "High Risk"
  else risk = "Very High Risk"

  const countryCode = html.match(/<th>Country Code<\/th>\s*<td>([A-Z]{2})<\/td>/)?.[1]
  const vpn = html.includes('<th>Anonymizing VPN</th>') && html.includes('Yes')
  const tor = html.includes('<th>Tor Exit Node</th>') && html.includes('Yes')
  const server = html.includes('<th>Server</th>') && html.includes('Yes')
  const proxy = (html.includes('<th>Public Proxy</th>') && html.includes('Yes')) || 
                (html.includes('<th>Web Proxy</th>') && html.includes('Yes'))
  const robot = html.includes('<th>Search Engine Robot</th>') && html.includes('Yes')
  $.log(`Score: ${score}`)
  $.log(`Risk: ${risk}`)
  $.log(`Country Code: ${countryCode}`)
  $.log(`VPN: ${vpn}`)
  $.log(`Tor: ${tor}`)
  $.log(`Server: ${server}`)
  $.log(`Proxy: ${proxy}`)
  $.log(`Robot: ${robot}`)
  
  return { score, risk, countryCode, vpn, tor, server, proxy, robot }
}

// Get IPWhois information
async function db_ipwhois(ip) {
  const res = await $.http.get({
    url: `https://ipwhois.io/widget?ip=${ip}&lang=en`,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
      'Referer': 'https://ipwhois.io/',
    },
    timeout: arg.timeout * 1000
  })

  const data = JSON.parse(res.body)
  $.log(`IPWhois Data: ${JSON.stringify(data)}`)
  return {
    country: data.country,
    country_code: data.country_code,
    city: data.city,
    isp: data.isp,
    org: data.connection.org,
    asn: data.connection.asn,
    proxy: data.security.proxy,
    tor: data.security.tor,
    vpn: data.security.vpn,
    server: data.security.hosting
  }
}

// 修改后的方法：查询国内IP信息，使用Ctrip API
async function db_domestic() {
  try {
    // 从Ctrip API获取IP
    const ctripRes = await $.http.get({
      url: 'https://cdid.c-ctrip.com/model-poc2/h',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: arg.timeout * 1000
    });

    const ip = ctripRes.body.trim();
    $.log(`Obtained IP from Ctrip: ${ip}`);

    // 使用获取到的IP查询netart API
    const infoRes = await $.http.get({
      url: `https://ipvx.netart.cn/${ip}`,
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: arg.timeout * 1000
    });

    const infoData = JSON.parse(infoRes.body);

    if (!infoData.as || !infoData.regions_short) {
      throw new Error(`缺少必要的字段 in infoData for IP: ${ip}`);
    }

    const info = infoData.as.info || '未知运营商';
    const regionsShort = Array.isArray(infoData.regions_short) ? infoData.regions_short.join(', ') : '未知地区';
    const type = infoData.type || '未知类型';

    return {
      title: `${info} - ${regionsShort} (${type})`,
      ip: ip
    };
  } catch (error) {
    $.logErr(`db_domestic 错误: ${error.message}`);
    return {
      title: `国内IP查询失败: ${error.message}`,
      ip: null
    };
  }
}

// 新增函数：获取国旗表情符号
function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

// 修改后的 formatContent 函数
function formatContent(ipInfo, scamalyticsInfo, ipwhoisInfo) {
  const content = [];
  content.push(`🌐 IP: ${ipInfo.ip}`);
  
  // 组合国家和城市信息
  let locationInfo = '';
  const flagEmoji = getFlagEmoji(ipwhoisInfo.country_code);

  if (ipwhoisInfo.city && ipwhoisInfo.country) {
    locationInfo = `${ipwhoisInfo.city} | ${flagEmoji} ${ipwhoisInfo.country}`;
  } else if (ipwhoisInfo.country) {
    locationInfo = `${flagEmoji} ${ipwhoisInfo.country}`;
  } else if (ipwhoisInfo.city) {
    locationInfo = ipwhoisInfo.city;
  }

  if (locationInfo) {
    content.push(`🌎 Location: ${locationInfo}`);
  }
  
  // 处理 ISP、Organization 和 ASN 信息
  const ispInfo = ipwhoisInfo.isp || '';
  const orgInfo = ipwhoisInfo.org || '';
  const asnInfo = ipwhoisInfo.asn || '';
  
  if (ispInfo && ispInfo === orgInfo && ispInfo === asnInfo) {
    content.push(`📟 Operator: ${ispInfo}`);
  } else {
    if (ispInfo) content.push(`📟 Operator: ${ispInfo}`);
    if (orgInfo && orgInfo !== ispInfo) content.push(`⛩️ Organization: ${orgInfo}`);
    if (asnInfo && asnInfo !== ispInfo && asnInfo !== orgInfo) content.push(`🔢 ASN: ${asnInfo}`);
  }
  
  return content.join('\n');
}

// Show score
function show_score(scamalyticsInfo) {
  const scoreBar = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█']
  const score = scamalyticsInfo.score
  const barIndex = score !== null ? Math.floor(score / 12.5) : 0
  const bar = score !== null ? scoreBar.slice(0, barIndex + 1).join('') : 'N/A'
  return `🔍 Scamalytics Score: ${score !== null ? score : 'N/A'} ${bar} (${scamalyticsInfo.risk})`
}

// Show risk factors
function show_factor(ipwhoisInfo) {
  const factors = []
  if (ipwhoisInfo.proxy) factors.push('🛡️ Proxy')
  if (ipwhoisInfo.vpn) factors.push('🕵️ VPN')
  if (ipwhoisInfo.tor) factors.push('🌀 Tor')
  if (ipwhoisInfo.server) factors.push('💾 Server/Data Center')
  return `⚠️ Risk Factors: ${factors.join(', ') || 'None'}`
}

// Send notification
async function notify(title, subt, desc, opts) {
  if (arg.notify) {
    $.msg(title, subt, desc, opts)
  } else {
    $.log('Notify Skipped', title, subt, desc, opts)
  }
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}runScript(t,e){return new Promise(s=>{let a=this.getdata("@chavy_boxjs_userCfgs.httpapi");a=a?a.replace(/\n/g,"").trim():a;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[i,o]=a.split("@"),n={url:`http://${o}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":i,Accept:"*/*"},timeout:r};this.post(n,(t,e,a)=>s(a))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const a=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of a)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,a)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[a+1])>>0==+e[a+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,a]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,a,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,a,r]=/^@(.*?)\.(.*?)$/.exec(e),i=this.getval(a),o=a?"null"===i?null:i||"{}":"{}";try{const e=JSON.parse(o);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),a)}catch(e){const i={};this.lodash_set(i,r,t),s=this.setval(JSON.stringify(i),a)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t.stack)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}

