const $ = new Env('network-info');

$.isPanel = () => $.isSurge() && typeof $input != 'undefined' && $.lodash_get($input, 'purpose') === 'panel';

let arg;
if (typeof $argument !== 'undefined') {
    arg = Object.fromEntries($argument.split('&').map(item => {
        const [key, value] = item.split('=');
        return [key, decodeURIComponent(value)];
    }));
}

let title = '';
let content = '';
let icon = 'licenseplate.fill';  // 你可以替换成你想要的图标
let iconColor = '#ffff00';  // 替换成你想要的颜色

let config = {
  enableQuote: $.lodash_get(arg, 'enableQuote') !== 'false', // Enable quotes by default
  enableCalcExecTime: $.lodash_get(arg, 'enableCalcExecTime') === 'true',
  enableSurgeUptime: $.lodash_get(arg, 'enableSurgeUptime') === 'true',
  customIcon: $.lodash_get(arg, 'customIcon') || icon,
  customIconColor: $.lodash_get(arg, 'customIconColor') || iconColor
};

if (config.customIcon && config.customIconColor) {
  icon = config.customIcon;
  iconColor = config.customIconColor;
}

!(async () => {
  let startTime = new Date();

  let quote = config.enableQuote ? await getQuote() : '';
  let scriptExecutionTime = config.enableCalcExecTime ? calculateElapsedTime(startTime) : '';
  let surgeUptime = config.enableSurgeUptime ? await getSurgeUptime() : '';

  console.log("脚本执行时间:", scriptExecutionTime);
  console.log("Surge运行时间:", surgeUptime);

  let { CN_IPv4, CN_IPv6, CN_ORG } = await getDirectInfo();

  // 获取 SSID、LAN IP 和 Router IP
  const ssid = getSSID();
  const { lanIP, routerIP } = getNetworkDetails();
  const localnetwork = generateLocalNetwork(lanIP, routerIP);

  const Time = new Date().toTimeString().split(' ')[0];

  scriptExecutionTime = calculateElapsedTime(startTime);

  // 处理 CN_ORG 格式信息，例如："北京市 - 海淀区|中国移动无线基站网络"
  let parts = CN_ORG.split("|");  // 使用 "|" 分割字符串
  let location = parts[0].trim(); // 获取 "北京市 - 海淀区"
  let serviceProvider = parts.length > 1 ? parts[1].trim() : '';  // 获取 "中国移动无线基站网络"
  let locationParts = location.split("-");
  location = locationParts.map(part => part.trim()).join(" - ");

  // 仅在 serviceProvider 非空时添加 "|", 否则仅使用 location
  CN_ORG = serviceProvider ? `${location} | ${serviceProvider}` : location;

  // 检查 CN_ORG 是否以 "|" 结尾，如果是，则去掉末尾的 "|"
  if (CN_ORG.endsWith('|')) {
    CN_ORG = CN_ORG.slice(0, -1).trim();
  }

  console.log("Formatted CN_ORG: ", CN_ORG); // 输出格式化后的结果
  console.log("scriptExecutionTime: ", scriptExecutionTime);

  function getSSID() {
    const ssid = $network.wifi?.ssid;
    console.log('$network:', $network);
    // 如果ssid存在，则返回'🛜'，否则打印'Cellular'并返回'📶'
    console.log('getSSID():', ssid ? '🛜' : 'Cellular');
    return ssid ? '🛜' : '📶';
  }

  // 检查是否连接到 WiFi
  const isWifi = getSSID() !== '📶';

  if (config.enableIconChange) {
    icon = getSSID() !== '📶' ? 'chart.bar.fill' : 'cellularbars';
    iconColor = getSSID() !== '📶' ? '#3498db' : '#2ecc71';
  }

  // 根据网络状态更改图标
  icon = isWifi ? 'chart.bar.fill' : 'cellularbars';
  iconColor = isWifi ? '#3498db' : '#2ecc71';

  if (isWifi) {
    title = `${ssid} `;
  } else {
    title = `${ssid} `;
  }

  title += `${CN_ORG}`;

  if (config.enableQuote) {
    title += `\n💎 ${quote}`;
  }

  if (CN_IPv4 !== '-' && CN_IPv6 !== '-') {
    content += `🌐 ${CN_IPv4} | ${CN_IPv6}`;
  } else if (CN_IPv4 !== '-') {
    content += `🌐 ${CN_IPv4}`;
  }

  content += `\n📡 ${CN_ORG}`;

  if (isWifi) {
    // 只有在连接 WiFi 时才显示 Router 和 LAN IP
    // content += `\n🅿️: ${LOCNET}`;
  }
  // content += `\n⌛️ ${Time}`;
  // content += `\n⌛️ 执行时间: ${scriptExecutionTime}`;
  content += `\n⌛ ${Time}`;
  content += `\n🚀 ${surgeUptime}`;
})()
  .catch(async e => {
    $.logErr(e);
    const msg = `${$.lodash_get(e, 'message') || $.lodash_get(e, 'error') || e}`;
    title = `❌`;
    content = msg;
    await notify('网络信息', title, content);
  })
  .finally(() => {
    const result = { title, content, icon, iconColor, ...arg };
    $.log($.toStr(result));
    $.done(result);
  });

function getNetworkDetails() {
  const { v4 } = $network;
  let details = { lanIP: 'Failed.', routerIP: 'Failed.' };

  // 如果有IPv4信息，从中提取设备IP和路由器IP
  if (v4) {
    if (v4.primaryAddress) {
      details.lanIP = v4.primaryAddress;
    }
    if (v4.primaryRouter) {
      details.routerIP = v4.primaryRouter;
    }
  }

  return details;
}

function generateLocalNetwork(lanIP, routerIP) {
  const lanParts = lanIP.split('.');
  const routerParts = routerIP.split('.');

  let localnetwork = '';

  for (let i = 0; i < lanParts.length; i++) {
    if (lanParts[i] === routerParts[i]) {
      localnetwork += lanParts[i] + '.';
    } else {
      localnetwork += routerParts[i] + ' / ' + lanParts[i].split('/')[0];
      break;
    }
  }

  return localnetwork;
}

function calculateElapsedTime(startTime) {
  let endTime = new Date();
  let timeDiff = endTime - startTime; // 时间差，单位毫秒
  let hours = Math.floor(timeDiff / 3600000);
  timeDiff %= 3600000;
  let minutes = Math.floor(timeDiff / 60000);
  timeDiff %= 60000;
  let seconds = Math.floor(timeDiff / 1000);

  let elapsedTime = '';
  if (hours > 0) elapsedTime += `${hours}:`;
  if (minutes > 0) elapsedTime += `${minutes}:`;
  elapsedTime += `${seconds}:`;

  return elapsedTime;
}

async function getSurgeUptime() {
  try {
    let response = await httpAPI("/v1/traffic", "GET");
    let startTime = response.startTime;  // 单位为Unix时间戳秒
    let currentTime = Math.floor(Date.now() / 1000); // 当前时间Unix时间戳秒
    let uptimeInSeconds = currentTime - startTime;
    let hours = Math.floor(uptimeInSeconds / 3600);
    let minutes = Math.floor((uptimeInSeconds % 3600) / 60);
    let seconds = uptimeInSeconds % 60;

    return `${hours}h.${minutes}m.${seconds}s`;  // 使用英文缩写
  } catch {
    return "Why does love still talk about who comes first.";
  }
}

function httpAPI(path = "", method = "POST", body = null) {
  return new Promise((resolve) => {
    $httpAPI(method, path, body, (result) => {
      resolve(result);
    });
  });
}

async function notify(title, subt, desc, opts) {
  if ($.lodash_get(arg, 'notify')) {
    $.msg(title, subt, desc, opts);
  } else {
    $.log('🔕', title, subt, desc, opts);
  }
}

async function getDirectInfo() {
  let CN_IPv4 = '-';
  let CN_IPv6 = '-';
  let CN_ORG = '-';

  try {
    const resIPv4 = await $.http.get({
      url: 'http://v4.ip.zxinc.org/info.php?type=json',
      headers: { 'User-Agent': 'Mozilla/5.0 ...' }
    });
    const dataIPv4 = JSON.parse(resIPv4.body).data;
    CN_IPv4 = dataIPv4.myip;
    if (resIPv4.body.includes('location')) {
      CN_ORG = dataIPv4.location;
    }

    const resIPv6 = await $.http.get({
      url: 'http://v6.ip.zxinc.org/info.php?type=json',
      headers: { 'User-Agent': 'Mozilla/5.0 ...' }
    });
    const dataIPv6 = JSON.parse(resIPv6.body).data;
    CN_IPv6 = dataIPv6.myip;

  } catch (e) {
    $.logErr(e);
    return { CN_IPv4, CN_IPv6, CN_ORG };
  }

  return { CN_IPv4, CN_IPv6, CN_ORG };
}

async function getQuote() {
  return new Promise((resolve, reject) => {
    let url = 'https://international.v1.hitokoto.cn/?c=a&c=b&c=j&c=d&min_length=7&max_length=18';
    $httpClient.get(url, function (error, response, data) {
      if (error) {
        reject(`error: ${error.message}`);
        return;
      }
      if (response.status !== 200) {
        reject(`failed to fetch data. http status: ${response.status}`);
        return;
      }
      let parsedData = JSON.parse(data);
      if (parsedData) {
        let extractedText = parsedData.hitokoto;
        if (parsedData.from_who || parsedData.from) {
          extractedText += '- ';
        }
        if (parsedData.from_who) {
          extractedText += `${parsedData.from_who}`;
        }
        if (parsedData.from) {
          extractedText += `《${parsedData.from}》`;
        }
        resolve(extractedText);
      } else {
        reject('failed to fetch data');
      }
    });
  });
}

  // prettier-ignore
function Env(t,s){class e{constructor(t){this.env=t}send(t,s="GET"){t="string"==typeof t?{url:t}:t;let e=this.get;return"POST"===s&&(e=this.post),new Promise((s,i)=>{e.call(this,t,(t,e,r)=>{t?i(t):s(e)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,s){this.name=t,this.http=new e(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,s),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $environment&&$environment["surge-version"]}isLoon(){return"undefined"!=typeof $loon}isShadowrocket(){return"undefined"!=typeof $rocket}isStash(){return"undefined"!=typeof $environment&&$environment["stash-version"]}toObj(t,s=null){try{return JSON.parse(t)}catch{return s}}toStr(t,s=null){try{return JSON.stringify(t)}catch{return s}}getjson(t,s){let e=s;const i=this.getdata(t);if(i)try{e=JSON.parse(this.getdata(t))}catch{}return e}setjson(t,s){try{return this.setdata(JSON.stringify(t),s)}catch{return!1}}getScript(t){return new Promise(s=>{this.get({url:t},(t,e,i)=>s(i))})}runScript(t,s){return new Promise(e=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=s&&s.timeout?s.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,s,i)=>e(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s);if(!e&&!i)return{};{const i=e?t:s;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s),r=JSON.stringify(this.data);e?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(s,r):this.fs.writeFileSync(t,r)}}lodash_get(t,s,e){const i=s.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return e;return r}lodash_set(t,s,e){return Object(t)!==t?t:(Array.isArray(s)||(s=s.toString().match(/[^.[\]]+/g)||[]),s.slice(0,-1).reduce((t,e,i)=>Object(t[e])===t[e]?t[e]:t[e]=Math.abs(s[i+1])>>0==+s[i+1]?[]:{},t)[s[s.length-1]]=e,t)}getdata(t){let s=this.getval(t);if(/^@/.test(t)){const[,e,i]=/^@(.*?)\.(.*?)$/.exec(t),r=e?this.getval(e):"";if(r)try{const t=JSON.parse(r);s=t?this.lodash_get(t,i,""):s}catch(t){s=""}}return s}setdata(t,s){let e=!1;if(/^@/.test(s)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(s),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const s=JSON.parse(h);this.lodash_set(s,r,t),e=this.setval(JSON.stringify(s),i)}catch(s){const o={};this.lodash_set(o,r,t),e=this.setval(JSON.stringify(o),i)}}else e=this.setval(t,s);return e}getval(t){return this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,s){return this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$persistentStore.write(t,s):this.isQuanX()?$prefs.setValueForKey(t,s):this.isNode()?(this.data=this.loaddata(),this.data[s]=t,this.writedata(),!0):this.data&&this.data[s]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,s=(()=>{})){if(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status?e.status:e.statusCode,e.status=e.statusCode),s(t,e,i)});else if(this.isQuanX())this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:r,body:o}=t;s(null,{status:e,statusCode:i,headers:r,body:o},o)},t=>s(t&&t.error||"UndefinedError"));else if(this.isNode()){let e=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,s)=>{try{if(t.headers["set-cookie"]){const e=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();e&&this.ckjar.setCookieSync(e,null),s.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:r,headers:o,rawBody:h}=t,a=e.decode(h,this.encoding);s(null,{status:i,statusCode:r,headers:o,rawBody:h,body:a},a)},t=>{const{message:i,response:r}=t;s(i,r,r&&e.decode(r.rawBody,this.encoding))})}}post(t,s=(()=>{})){const e=t.method?t.method.toLocaleLowerCase():"post";if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[e](t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status?e.status:e.statusCode,e.status=e.statusCode),s(t,e,i)});else if(this.isQuanX())t.method=e,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:r,body:o}=t;s(null,{status:e,statusCode:i,headers:r,body:o},o)},t=>s(t&&t.error||"UndefinedError"));else if(this.isNode()){let i=require("iconv-lite");this.initGotEnv(t);const{url:r,...o}=t;this.got[e](r,o).then(t=>{const{statusCode:e,statusCode:r,headers:o,rawBody:h}=t,a=i.decode(h,this.encoding);s(null,{status:e,statusCode:r,headers:o,rawBody:h,body:a},a)},t=>{const{message:e,response:r}=t;s(e,r,r&&i.decode(r.rawBody,this.encoding))})}}time(t,s=null){const e=s?new Date(s):new Date;let i={"M+":e.getMonth()+1,"d+":e.getDate(),"H+":e.getHours(),"m+":e.getMinutes(),"s+":e.getSeconds(),"q+":Math.floor((e.getMonth()+3)/3),S:e.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(e.getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in i)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[s]:("00"+i[s]).substr((""+i[s]).length)));return t}queryStr(t){let s="";for(const e in t){let i=t[e];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),s+=`${e}=${i}&`)}return s=s.substring(0,s.length-1),s}msg(s=t,e="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()||this.isShadowrocket()||this.isStash()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let s=t.openUrl||t.url||t["open-url"],e=t.mediaUrl||t["media-url"];return{openUrl:s,mediaUrl:e}}if(this.isQuanX()){let s=t["open-url"]||t.url||t.openUrl,e=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":s,"media-url":e,"update-pasteboard":i}}if(this.isSurge()||this.isShadowrocket()||this.isStash()){let s=t.url||t.openUrl||t["open-url"];return{url:s}}}};if(this.isMute||(this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$notification.post(s,e,i,o(r)):this.isQuanX()&&$notify(s,e,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(s),e&&t.push(e),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,s){const e=!this.isSurge()||this.isShadowrocket()&&!this.isQuanX()&&!this.isLoon()&&!this.isStash();e?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(s=>setTimeout(s,t))}done(t={}){const s=(new Date).getTime(),e=(s-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${e} \u79d2`),this.log(),this.isSurge()||this.isShadowrocket()||this.isQuanX()||this.isLoon()||this.isStash()?$done(t):this.isNode()&&process.exit(1)}}(t,s)}

  