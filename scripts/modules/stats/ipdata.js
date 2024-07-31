const NAME = 'ipdata'
const $ = new Env(NAME)

let arg = {}
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
!(async () => {
    let [info, chatStatus] = await Promise.all([getInfo(), checkOpenAI()])
  
    $.log($.toStr(info))
    const { ip, type, asn, countryCode, country, city, state, trustScore, trustScoreRisk, organization, operator } = info
    const flag = getFlagEmoji(countryCode)
    const isVerified = trustScore !== '0'
    const verifiedStatus = isVerified ? 'Verified IP !' : 'Unverified IP !'
  
    let title = chatStatus.status
    let content = [
      `🅖 & 🅰🅸: ${chatStatus.ip} & ${info.ip || '-'}`,
      `GEO: ${getFlagEmoji(info.countryCode)} ${info.country} | ${info.city} ${info.state ? ` - ${info.state}` : ''}`,
      `ASN: ${info.asn} | ${info.operator}`,
      `REP: ${info.type} | ${info.trustScoreRisk} - Trust Score is ${info.trustScore}.`,
      `Done: Test completed at ${new Date().toTimeString().split(' ')[0]}`
    ].filter(item => item).join('\n')

  if (arg.notify) {
    await notify(NAME, title, content)
  }

  result = {
    title,
    content,
    icon: arg.icon,
    'icon-color': arg.iconColor
  }
})()
.catch(async e => {
  $.logErr(e)
  const msg = `${$.lodash_get(e, 'message') || $.lodash_get(e, 'error') || e}`
  result = {
    title: '❌ Error',
    content: msg,
    icon: arg.icon,
    'icon-color': arg.iconColor
  }
  if (arg.notify) {
    await notify(NAME, result.title, result.content)
  }
})
.finally(async () => {
  $.log(JSON.stringify(result))
  $.done(result)
})

// 通知
async function notify(title, subt, desc, opts) {
  if (arg.notify) {
    $.msg(title, subt, desc, opts)  
  } else {
    $.log('🔕', title, subt, desc, opts)
  }
}

async function getInfo() {
    let ipv4 = ''
    let ipv6 = ''
    let info = {}
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
  
  
      // 查询 IPv4 信息
      if (ipv4) {
        const ipv4Res = await $.http.get({
          url: `https://www.ipdata.co/${ipv4}`,
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/109.0.0.0',
          },
          timeout: arg.timeout * 1000
        })
  
        let body = ipv4Res.body
        //$.log(`https://www.ipdata.co/${ipv4} 返回的 HTML:`)
        //$.log(body)
  
        // 使用正则表达式提取所需信息
        const ip = ipv4
        const type = body.match(/<div class="sidebar-card-value">\s*([\w\s]+)\s*<\/div>/)?.[1]?.trim() || '-'
        const asn = body.match(/<div class="sidebar-card-value">\s*(AS\d+)\s*<\/div>/)?.[1]?.trim() || '-'
        const countryCode = body.match(/<img src="https:\/\/ipdata\.co\/flags\/([\w]+)\.png"/)?.[1]?.trim() || '-'
        const country = body.match(/<div class="sidebar-section">\s*<div class="sidebar-section-sidenote">Country<\/div>\s*<div class="sidebar-section-title">\s*([\w\s]+)\s*<\/div>/s)?.[1]?.trim() || '-'
        const city = body.match(/<section id="city">\s*<div class="sidebar-section">\s*<div class="sidebar-section-sidenote">City<\/div>\s*<div class="sidebar-section-title">\s*([\w\s]+)\s*<\/div>/s)?.[1]?.trim() || '-'
        const state = body.match(/is in the state of\s*([\w\s]+)/)?.[1]?.trim() || ''
        const trustScore = body.match(/<div class="sidebar-trust-score-value(?:\s+sidebar-threats-score)?\s+sidebar-trust-score-value-(?:danger|warning)">\s*(\d+)\s*(?:–\s*[\w\s]+)?\s*<\/div>/)?.[1]?.trim() || '-'
        const trustScoreRisk = body.match(/–\s*([\w\s]+)\s*<\/div>/)?.[1]?.trim() || '-'
        const organization = body.match(/<div class="sidebar-section-title">\s*([\w\s]+)\s*<\/div>/)?.[3]?.trim() || '-'
        const operator = body.match(/<div class="sidebar-section-sidenote">\s*Operator\s*<\/div>\s*<div class="sidebar-section-title">\s*([\w\s]+)\s*<\/div>/s)?.[1]?.trim() || '-'

        info = {
          ip,
          type,
          asn,
          countryCode,
          country,
          city,
          state,
          trustScore,
          trustScoreRisk,
          organization,
          operator
        }
      }
    } catch (e) {
      $.logErr(e)
      $.logErr($.toStr(e))
      console.log('IP:', ip)
      $.log('Type:', type)
      $.log('ASN:', asn)
      $.log('Country Code:', countryCode)
      $.log('Country:', country)
      $.log('City:', city)
      $.log('State:', state)
      $.log('Trust Score:', trustScore)
      $.log('Trust Score Risk:', trustScoreRisk)
      $.log('Organization:', organization)
      $.log('Operator:', operator)
    }
  
    info.ipv4 = ipv4
    info.ipv6 = ipv6
    return info
}

async function checkOpenAI() {
  if (arg.checkOpenAI !== true) {
    return {
      status: '',  
      ip: ''
    }
  }

  const SUPPORT_COUNTRY = ["AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ", "BS", "BD", "BB", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR", "BN", "BG", "BF", "CV", "CA", "CL", "CO", "KM", "CG", "CR", "CI", "HR", "CY", "CZ", "DK", "DJ", "DM", "DO", "EC", "SV", "EE", "FJ", "FI", "FR", "GA", "GM", "GE", "DE", "GH", "GR", "GD", "GT", "GN", "GW", "GY", "HT", "VA", "HN", "HU", "IS", "IN", "ID", "IQ", "IE", "IL", "IT", "JM", "JP", "JO", "KZ", "KE", "KI", "KW", "KG", "LV", "LB", "LS", "LR", "LI", "LT", "LU", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM", "MD", "MC", "MN", "ME", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PL", "PT", "QA", "RO", "RW", "KN", "LC", "VC", "WS", "SM", "ST", "SN", "RS", "SC", "SL", "SG", "SK", "SI", "SB", "ZA", "KR", "ES", "LK", "SR", "SE", "CH", "TW", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR", "TV", "UG", "UA", "AE", "GB", "US", "UY", "VU", "ZM"];
  const url = "https://chat.openai.com/cdn-cgi/trace"
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
  }
  const timeout = arg.timeout * 1000  

  try {
    const res = await $.http.get({ url, headers, timeout })
    const traceInfo = res.body.trim().split('\n').reduce((obj, line) => {
      const [key, value] = line.split('=')
      obj[key] = value
      return obj  
    }, {})

    const loc = traceInfo.loc
    const status = SUPPORT_COUNTRY.includes(loc) ? "🟢" : "🔴"
    const emoji = getFlagEmoji(loc)
    const ip = traceInfo.ip

    const result = {
      status: `🅰🅸: ${status} | ${emoji} ${loc}`,
      ip: ip
    }

    $.log('CheckOpenAI:', JSON.stringify(result))  // 打印 checkOpenAI 函数返回的 JSON 结果

    return result
  } catch (error) {
    const result = {
      status: "🅰🅸: ❌", 
      ip: ' - '
    }

    $.log('CheckOpenAI:', JSON.stringify(result))  // 打印 checkOpenAI 函数返回的 JSON 结果

    return result
  }
}

function getFlagEmoji(code) {
  if (code) {
    const codePoints = [...code.toUpperCase()].map(c => c.codePointAt() + 127397)
    return String.fromCodePoint(...codePoints)
  }
  return ''
}

// prettier-ignore
function Env(t,s){class e{constructor(t){this.env=t}send(t,s="GET"){t="string"==typeof t?{url:t}:t;let e=this.get;return"POST"===s&&(e=this.post),new Promise((s,i)=>{e.call(this,t,(t,e,r)=>{t?i(t):s(e)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,s){this.name=t,this.http=new e(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,s),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $environment&&$environment["surge-version"]}isLoon(){return"undefined"!=typeof $loon}isShadowrocket(){return"undefined"!=typeof $rocket}isStash(){return"undefined"!=typeof $environment&&$environment["stash-version"]}toObj(t,s=null){try{return JSON.parse(t)}catch{return s}}toStr(t,s=null){try{return JSON.stringify(t)}catch{return s}}getjson(t,s){let e=s;const i=this.getdata(t);if(i)try{e=JSON.parse(this.getdata(t))}catch{}return e}setjson(t,s){try{return this.setdata(JSON.stringify(t),s)}catch{return!1}}getScript(t){return new Promise(s=>{this.get({url:t},(t,e,i)=>s(i))})}runScript(t,s){return new Promise(e=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=s&&s.timeout?s.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,s,i)=>e(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s);if(!e&&!i)return{};{const i=e?t:s;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s),r=JSON.stringify(this.data);e?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(s,r):this.fs.writeFileSync(t,r)}}lodash_get(t,s,e){const i=s.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return e;return r}lodash_set(t,s,e){return Object(t)!==t?t:(Array.isArray(s)||(s=s.toString().match(/[^.[\]]+/g)||[]),s.slice(0,-1).reduce((t,e,i)=>Object(t[e])===t[e]?t[e]:t[e]=Math.abs(s[i+1])>>0==+s[i+1]?[]:{},t)[s[s.length-1]]=e,t)}getdata(t){let s=this.getval(t);if(/^@/.test(t)){const[,e,i]=/^@(.*?)\.(.*?)$/.exec(t),r=e?this.getval(e):"";if(r)try{const t=JSON.parse(r);s=t?this.lodash_get(t,i,""):s}catch(t){s=""}}return s}setdata(t,s){let e=!1;if(/^@/.test(s)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(s),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const s=JSON.parse(h);this.lodash_set(s,r,t),e=this.setval(JSON.stringify(s),i)}catch(s){const o={};this.lodash_set(o,r,t),e=this.setval(JSON.stringify(o),i)}}else e=this.setval(t,s);return e}getval(t){return this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,s){return this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$persistentStore.write(t,s):this.isQuanX()?$prefs.setValueForKey(t,s):this.isNode()?(this.data=this.loaddata(),this.data[s]=t,this.writedata(),!0):this.data&&this.data[s]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,s=(()=>{})){if(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status?e.status:e.statusCode,e.status=e.statusCode),s(t,e,i)});else if(this.isQuanX())this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:r,body:o}=t;s(null,{status:e,statusCode:i,headers:r,body:o},o)},t=>s(t&&t.error||"UndefinedError"));else if(this.isNode()){let e=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,s)=>{try{if(t.headers["set-cookie"]){const e=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();e&&this.ckjar.setCookieSync(e,null),s.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:r,headers:o,rawBody:h}=t,a=e.decode(h,this.encoding);s(null,{status:i,statusCode:r,headers:o,rawBody:h,body:a},a)},t=>{const{message:i,response:r}=t;s(i,r,r&&e.decode(r.rawBody,this.encoding))})}}post(t,s=(()=>{})){const e=t.method?t.method.toLocaleLowerCase():"post";if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[e](t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status?e.status:e.statusCode,e.status=e.statusCode),s(t,e,i)});else if(this.isQuanX())t.method=e,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:r,body:o}=t;s(null,{status:e,statusCode:i,headers:r,body:o},o)},t=>s(t&&t.error||"UndefinedError"));else if(this.isNode()){let i=require("iconv-lite");this.initGotEnv(t);const{url:r,...o}=t;this.got[e](r,o).then(t=>{const{statusCode:e,statusCode:r,headers:o,rawBody:h}=t,a=i.decode(h,this.encoding);s(null,{status:e,statusCode:r,headers:o,rawBody:h,body:a},a)},t=>{const{message:e,response:r}=t;s(e,r,r&&i.decode(r.rawBody,this.encoding))})}}time(t,s=null){const e=s?new Date(s):new Date;let i={"M+":e.getMonth()+1,"d+":e.getDate(),"H+":e.getHours(),"m+":e.getMinutes(),"s+":e.getSeconds(),"q+":Math.floor((e.getMonth()+3)/3),S:e.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(e.getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in i)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[s]:("00"+i[s]).substr((""+i[s]).length)));return t}queryStr(t){let s="";for(const e in t){let i=t[e];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),s+=`${e}=${i}&`)}return s=s.substring(0,s.length-1),s}msg(s=t,e="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()||this.isShadowrocket()||this.isStash()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let s=t.openUrl||t.url||t["open-url"],e=t.mediaUrl||t["media-url"];return{openUrl:s,mediaUrl:e}}if(this.isQuanX()){let s=t["open-url"]||t.url||t.openUrl,e=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":s,"media-url":e,"update-pasteboard":i}}if(this.isSurge()||this.isShadowrocket()||this.isStash()){let s=t.url||t.openUrl||t["open-url"];return{url:s}}}};if(this.isMute||(this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$notification.post(s,e,i,o(r)):this.isQuanX()&&$notify(s,e,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(s),e&&t.push(e),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,s){const e=!this.isSurge()||this.isShadowrocket()&&!this.isQuanX()&&!this.isLoon()&&!this.isStash();e?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(s=>setTimeout(s,t))}done(t={}){const s=(new Date).getTime(),e=(s-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${e} \u79d2`),this.log(),this.isSurge()||this.isShadowrocket()||this.isQuanX()||this.isLoon()||this.isStash()?$done(t):this.isNode()&&process.exit(1)}}(t,s)}
