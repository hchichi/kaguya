const NAME = 'ip.sb'
const $ = new Env(NAME)

let arg = {}
if (typeof $argument !== 'undefined') {
  arg = Object.fromEntries($argument.split('&').map(item => item.split('=')))
}

// 设置默认参数
const DEFAULT_ARGS = {
  checkAIAPIs: 'true', // 重命名为checkAIAPIs以涵盖多个AI服务
  timeout: '3',
  icon: 'location.app.fill',
  iconColor: '#5d8aa8',
  notify: 'true',
  panel_name: 'IP.SB',
  update_interval: '3600'
}

// 合并输入参数与默认参数
arg = { ...DEFAULT_ARGS, ...arg }

// 转换参数类型
arg.checkAIAPIs = arg.checkAIAPIs === 'true'
arg.notify = arg.notify === 'true'
arg.timeout = parseInt(arg.timeout)
arg.update_interval = parseInt(arg.update_interval)

$.log(`传入的参数: ${JSON.stringify(arg)}`)

let result = {}

;(async () => {
  try {
    const [info, aiStatus] = await Promise.all([getInfo(), checkAIAPIs()])

    const {
      ip = '',
      country = '',
      region = '',
      city = '',
      asn = '',
      asn_organization = '',
      organization = '',
      country_code = '',
      region_code = '',
      isp = ''
    } = info

    const flag = getFlagEmoji(country_code)
    const ipType = isIPv6(ip) ? 'IPv6' : 'IPv4'
    const ipEmoji = isIPv6(ip) ? '🌐' : '🌍'

    let content = []

    // 第一行: IP
    if (ip) {
      content.push(`${ipEmoji} ${ipType}: ${ip}`)
    }

    // 第二行: AIGC IP
    if (aiStatus.ChatGPT.ip && aiStatus.ChatGPT.ip !== ip) { // 确保AIGC IP与主IP不同
      content.push(`🧠 AIGC IP: ${aiStatus.ChatGPT.ip}`)
    }

    // 第三行: GEO 信息
    const thirdLineParts = []
    if (flag && country_code) {
      thirdLineParts.push(`${flag} ${country_code}`)
    }
    if (region_code && city) {
      thirdLineParts.push(`(${city}, ${region_code})`)
    } else if (region_code) {
      thirdLineParts.push(`(${region_code})`)
    } else if (city) {
      thirdLineParts.push(`(${city})`)
    }

    const thirdLine = thirdLineParts.join(' ')
    if (thirdLine.trim()) {
      content.push(`🌇 GEO: ${thirdLine.trim()}`)
    }

    // 第四行: ASN 信息
    let additionalField = ''

    if (asn && asn_organization) {
      additionalField = `🔢 ASN: ${asn_organization} (${asn})`
    } else if (asn) {
      additionalField = `🔢 ASN: ${asn}`
    } else if (asn_organization) {
      additionalField = `🏢 ASN Org: ${asn_organization}`
    } else if (organization) {
      additionalField = `🏢 Organization: ${organization}`
    } else if (isp) {
      additionalField = `📡 ISP: ${isp}`
    }

    if (additionalField) {
      content.push(additionalField)
    }

    // 最终内容，过滤空行并用换行符连接
    content = content.filter(Boolean).join('\n')

    // 构建标题，整合AI服务状态
    const titleEmoji = '🔍'
    const aiStatuses = [
      `Ⓞ: ${aiStatus.ChatGPT.status}`,
      `Ⓖ: ${aiStatus.Gemini.status}`
    ].join(' | ')

    //const title = `${titleEmoji} AI Services:\n${aiStatuses}`
    const title = `${aiStatuses}`

    result = {
      title,
      content,
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
      title: '✘ Error',
      content: msg,
      icon: arg.icon,
      'icon-color': arg.iconColor
    }
    if (arg.notify) {
      await notify(NAME, result.title, result.content)
    }
  }
})().finally(() => {
  $.log(JSON.stringify(result))
  $.done(result)
})

// 检查 AI APIs 的状态
async function checkAIAPIs() {  
  const AI_APIS = {
    ChatGPT: {
      urls: [
        "https://api.openai.com/compliance/cookie_requirements",
        "https://ios.chat.openai.com/"
      ],
      status: "N/A",
      region: "-"
    },
    Gemini: {
      urls: [
        "https://gemini.google.com"
      ],
      status: "N/A",
      region: "-"
    }
  }

  try {
    // ChatGPT 检测
    try {
      const [chatgptResponse1, chatgptResponse2] = await Promise.all([
        $.http.get({
          url: "https://api.openai.com/compliance/cookie_requirements",
          headers: getUnifiedHeaders()
        }),
        $.http.get({
          url: "https://ios.chat.openai.com/",
          headers: getUnifiedHeaders()
        })
      ]);

      // 检查网络连接
      if (!chatgptResponse1.body || !chatgptResponse2.body) {
        AI_APIS.ChatGPT.status = "✘ Failed (Network Connection)"
      } else {
        // 检查 'unsupported_country' 和 'VPN' 的存在
        const unsupportedCountry = /unsupported_country/i.test(chatgptResponse1.body)
        const vpnDetected = /VPN/i.test(chatgptResponse2.body)

        if (!unsupportedCountry && !vpnDetected) {
          // 获取地理位置信息
          try {
            const traceResponse = await $.http.get({
              url: "https://ios.chat.openai.com/cdn-cgi/trace",
              headers: getUnifiedHeaders(),
              timeout: arg.timeout * 1000
            })

            if (traceResponse.body) {
              const traceInfo = traceResponse.body.trim().split('\n').reduce((obj, line) => {
                const [key, value] = line.split('=')
                obj[key] = value
                return obj
              }, {})
              const loc = traceInfo.loc || '-'
              if (loc !== '-') {
                // 将三位国家代码转换为两位国家代码
                const cca2 = await $.http.get({
                  url: `https://restcountries.com/v3.1/alpha/${loc}`,
                  timeout: arg.timeout * 1000,
                  headers: getUnifiedHeaders()
                })
                .then(res => JSON.parse(res.body)[0]?.cca2 || '-')
                .catch(() => '-')

                AI_APIS.ChatGPT.region = cca2
                AI_APIS.ChatGPT.status = `✔︎ (${getFlagEmoji(cca2)} ${cca2})`
              } else {
                AI_APIS.ChatGPT.status = "✔︎"
              }
              AI_APIS.ChatGPT.ip = traceInfo.ip || ""
            } else {
              AI_APIS.ChatGPT.status = "✔︎"
            }
          } catch (e) {
            $.logErr('ChatGPT Trace Error:', e)
            AI_APIS.ChatGPT.status = "✔︎"
          }
        } else if (unsupportedCountry && vpnDetected) {
          AI_APIS.ChatGPT.status = "✘ No"
        } else if (!unsupportedCountry && vpnDetected) {
          AI_APIS.ChatGPT.status = "♺ No (Only Available with Web Browser)"
        } else if (unsupportedCountry && !vpnDetected) {
          AI_APIS.ChatGPT.status = "♺ No (Only Available with Mobile APP)"
        } else {
          AI_APIS.ChatGPT.status = "✘ Failed (Error: N/A)"
        }
      }
    } catch (e) {
      $.logErr('ChatGPT Check Error:', e)
      AI_APIS.ChatGPT.status = " Error"
      AI_APIS.ChatGPT.region = "-"
    }

    // Gemini 检测
    try {
      const geminiResponse = await $.http.get({
        url: "https://gemini.google.com",
        headers: getUnifiedHeaders(),
        timeout: arg.timeout * 1000
      })

      if (!geminiResponse.body) {
        AI_APIS.Gemini.status = "✘ Failed (Network Connection)"
      } else {
        const geminiSuccess = /45631641,null,true/.test(geminiResponse.body)
        const countryCodeMatch = geminiResponse.body.match(/,2,1,200,"([A-Z]{3})"/)
        const countryCode = countryCodeMatch ? countryCodeMatch[1] : ""

        if (geminiSuccess && countryCode) {
          // 将三位国家代码转换为两位国家代码
          const geminiCca2 = await $.http.get({
            url: `https://restcountries.com/v3.1/alpha/${countryCode}`,
            timeout: arg.timeout * 1000,
            headers: getUnifiedHeaders()
          })
          .then(res => JSON.parse(res.body)[0]?.cca2 || '-')
          .catch(() => '-')

          AI_APIS.Gemini.status = `✔︎ (${getFlagEmoji(geminiCca2)} ${geminiCca2})`
          AI_APIS.Gemini.region = geminiCca2
        } else if (geminiSuccess) {
          AI_APIS.Gemini.status = "✔︎"
          AI_APIS.Gemini.region = "-"
        } else {
          AI_APIS.Gemini.status = "✘ No"
          AI_APIS.Gemini.region = "-"
        }
      }
    } catch (e) {
      $.logErr('Gemini Check Error:', e)
      AI_APIS.Gemini.status = "✘ Error"
      AI_APIS.Gemini.region = "-"
    }

    return AI_APIS
  } catch (e) {
    $.logErr(e);
    return {
      ChatGPT: { status: "✘ Error", region: "-", ip: "-" },
      Gemini: { status: "✘ Error", region: "-" }
    };
  }
}

// 获取统一的请求头，模拟iOS的Safari
function getUnifiedHeaders() {
  return {
    'User-Agent': getSafariUserAgent(),
    'sec-ch-ua': getSecCHUA(),
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"iOS"',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
}

// 辅助函数：获取 Safari User-Agent (iOS模仿)
function getSafariUserAgent() {
  return 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
}

// 获取国家旗帜 emoji
function getFlagEmoji(code) {
  if (code) {
    const codePoints = [...code.toUpperCase()].map(
      c => c.codePointAt() + 127397
    )
    return String.fromCodePoint(...codePoints)
  }
  return ''
}

// 发送通知
async function notify(title, subt, desc, opts) {
  if (arg.notify) {
    $.msg(title, subt, desc, opts)
  } else {
    $.log('Notify Skipped', title, subt, desc, opts)
  }
}

// 检查是否为 IPv6
function isIPv6(ip) {
  // 简单判断是否包含冒号
  return ip.includes(':')
}

// 获取 IP 信息
async function getInfo() {
  let info = {}
  try {
    const res = await $.http.get({
      url: 'https://api.ip.sb/geoip',
      headers: {
        'User-Agent': getUserAgent()
      },
      timeout: arg.timeout * 1000
    })

    info = JSON.parse(res.body)
  } catch (e) {
    $.logErr(e)
  }

  return info
}

// 辅助函数：获取 User-Agent
// function getUserAgent() {
//   return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
// }

// 辅助函数：获取 sec-ch-ua
// function getSecCHUA() {
//   return '"Google Chrome";v="110", "Not A(Brand";v="24", "Chromium";v="110"'
// }

// 辅助函数：获取 User-Agent
function getUserAgent() {
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
}

// 辅助函数：获取 sec-ch-ua
function getSecCHUA() {
  return '"Google Chrome";v="110", "Not A(Brand";v="24", "Chromium";v="110"'
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}runScript(t,e){return new Promise(s=>{let a=this.getdata("@chavy_boxjs_userCfgs.httpapi");a=a?a.replace(/\n/g,"").trim():a;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[i,o]=a.split("@"),n={url:`http://${o}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":i,Accept:"*/*"},timeout:r};this.post(n,(t,e,a)=>s(a))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const a=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of a)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,a)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[a+1])>>0==+e[a+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,a]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,a,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,a,r]=/^@(.*?)\.(.*?)$/.exec(e),i=this.getval(a),o=a?"null"===i?null:i||"{}":"{}";try{const e=JSON.parse(o);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),a)}catch(e){const i={};this.lodash_set(i,r,t),s=this.setval(JSON.stringify(i),a)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t.stack)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}