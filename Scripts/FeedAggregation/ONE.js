/**
 * ONE API Integration Script
 * 
 * 脚本说明:
 * 1. 通知内容固定使用ONE的内容，可通过参数控制使用摄影/阅读/电台
 * 2. 面板标题支持ONE/诗词/一言三种数据源
 * 3. 面板内容固定显示诗词天气信息
 * 4. 支持自定义面板图标和颜色
 * 
 * 使用方法:
 * 1. 直接运行: 
 *    - 通知使用ONE电台内容
 *    - 面板标题使用诗词
 *    - 默认图标 figure.baseball.circle.fill
 *    - 默认颜色 #ffbcd9
 * 
 * 2. 传入参数:
 * {
 *   "oneType": "photo|article|radio",  // 控制通知内容类型
 *   "panelType": "one|shici|yiyan",    // 控制面板标题数据源
 *   "icon": "figure.baseball.circle.fill", // 自定义面板图标
 *   "iconColor": "#ffbcd9"             // 自定义图标颜色
 * }
 * 
 * 参数说明:
 * 1. oneType (通知内容):
 *    - photo: ONE摄影   (标题、作者、作品、图片)
 *    - article: ONE阅读 (标题、作者、内容)
 *    - radio: ONE电台   (标题、主播、描述、音频)
 * 
 * 2. panelType (面板标题):
 *    - one: 使用ONE内容
 *    - shici: 使用今日诗词 (诗句、诗名、作者)
 *    - yiyan: 使用一言    (句子、来源、作者)
 * 
 * 3. icon: SF Symbols图标名称
 * 4. iconColor: 图标颜色(HEX格式)
 * 
 * 示例:
 * 1. 使用ONE摄影推送通知，面板标题使用诗词，自定义图标:
 * {
 *   "oneType": "photo", 
 *   "panelType": "shici",
 *   "icon": "heart.circle.fill",
 *   "iconColor": "#ff6b81"
 * }
 * 
 * 2. 使用ONE电台推送通知，面板标题使用一言，默认图标:
 * { 
 *   "oneType": "radio", 
 *   "panelType": "yiyan"
 * }
 * 
 * @author: Your Name
 * @supported: Surge
 * @version: 1.0.0
 */

const $ = new Env('ONE');

// 获取诗词 Token 并持久化
async function getShiciToken() {
    let token = $.getdata('shici_token');
    if (!token) {
      const tokenResp = await $.http.get('https://v2.jinrishici.com/token');
      token = JSON.parse(tokenResp.body).data;
      $.setdata(token, 'shici_token');
    }
    return token;
  }

  /**
  // 获取诗词天气信息
  async function getShiciInfo() {
    const infoResp = await $.http.get('https://v2.jinrishici.com/info');
    const info = JSON.parse(infoResp.body).data;
    const weather = info.weatherData;
    
    return weather ? 
      `${info.region} ${weather.weather} ${weather.temperature}℃ 湿度${weather.humidity}% 风力${weather.windPower}级${weather.pm25 ? ` PM2.5 ${weather.pm25}` : ''}${weather.rainfall ? ` 降水量${weather.rainfall}mm` : ''} [${weather.updateTime}]` : 
      '';
  }
  */

  // 获取诗词天气信息
async function getShiciInfo() {
  const infoResp = await $.http.get('https://v2.jinrishici.com/info');
  const info = JSON.parse(infoResp.body).data;
  const weather = info.weatherData;
  
  if (!weather) return '';
  
  // 处理地区名称
  const regions = info.region.split('|');
  const regionName = regions[0] === regions[1] ? 
    regions[0] : // 如果重复就只取第一个
    info.region;  // 不重复就保留完整的

  // 组装天气信息数组
  const weatherInfo = [
    // 地区
    `📍${regionName}`,
    // 天气状态和温度
    `${getWeatherEmoji(weather.weather)} ${weather.temperature}℃`,
    // 湿度
    `💧${weather.humidity}%`,
    // 风力
    `🌪️${weather.windPower}级`,
    // PM2.5（如果有）
    weather.pm25 ? `😷${weather.pm25}` : '',
    // 降水量（如果有）
    weather.rainfall ? `☔${weather.rainfall}mm` : ''
    // 更新时间
    //`[${weather.updateTime}]`
  ].filter(Boolean); // 过滤掉空值
  
  // 先用竖线连接主要信息，然后添加更新时间
  return weatherInfo.join(' | ') + ` [${weather.updateTime}]`;
}

// 获取天气对应的表情
function getWeatherEmoji(weather) {
  const weatherMap = {
    '晴': '☀️',
    '多云': '⛅',
    '阴': '☁️',
    '小雨': '🌧️',
    '中雨': '🌧️',
    '大雨': '⛈️',
    '暴雨': '⛈️',
    '雷阵雨': '⛈️',
    '小雪': '🌨️',
    '中雪': '🌨️',
    '大雪': '🌨️',
    '暴雪': '🌨️',
    '雾': '🌫️',
    '霾': '😷'
  };
  
  // 如果找不到对应的emoji，返回一个通用的天气emoji
  return weatherMap[weather] || '🌤️';
}


  // 获取诗词内容
async function getShici() {
    const token = await getShiciToken();
    const headers = {'X-User-Token': token};
    const shiciResp = await $.http.get({
      url: 'https://v2.jinrishici.com/sentence',
      headers
    });
    const shici = JSON.parse(shiciResp.body).data;
    
    return {
      // 标题组合content、title和author
      title: `${shici.content} —《${shici.origin.title}》`,
      
      // 内容组合translate、dynasty和author
      content: [
        shici.origin.translate?.[0], // 取第一句翻译
        `${shici.origin.dynasty} · ${shici.origin.author}`
      ].filter(Boolean).join('\n'),
      
      link: `https://jinrishici.com/detail/${shici.id}`
    };
  }

  // 获取一言
async function getYiyan(params = {}) {
    const defaultParams = {
      c: ['a','b','c'],
      max_length: 15
    };
    const finalParams = {...defaultParams, ...params};
    
    const queryString = Object.entries(finalParams)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map(v => `${key}=${v}`).join('&');
        }
        return `${key}=${value}`;
      })
      .join('&');
  
    const yiyanResp = await $.http.get(`https://international.v1.hitokoto.cn/?${queryString}`);
    const yiyan = JSON.parse(yiyanResp.body);
    
  // 修改标题和内容的组合逻辑
  return {
    // 标题组合hitokoto和from_who
    title: yiyan.from_who ? 
      `${yiyan.hitokoto} - ${yiyan.from_who}` : 
      yiyan.hitokoto,
    
    // 内容组合content、from和from_who
    content: [
      yiyan.hitokoto,
      yiyan.from && `《${yiyan.from}》`,
      yiyan.from_who && `by ${yiyan.from_who}`
    ].filter(Boolean).join(' '),
    
    link: `https://hitokoto.cn?uuid=${yiyan.uuid}`
  };
}

// 在 getONE 函数中，简化数据提取
async function getONE() {
  const idListResp = await $.http.get('http://v3.wufazhuce.com:8000/api/onelist/idlist');
  const latestId = JSON.parse(idListResp.body).data[0];
  
  const oneResp = await $.http.get(`http://v3.wufazhuce.com:8000/api/onelist/${latestId}/0`);
  const contents = JSON.parse(oneResp.body).data.content_list;
  
  const result = {};
  const categoryMap = {
    '0': 'photo',
    '1': 'article',
    '8': 'radio'
  };

  contents.forEach(content => {
    const type = categoryMap[content.category];
    if (!type) return;

    // 通用字段
    const item = {
      title: content.title,
      author: content.author?.user_name || content.text_author_info?.text_author_name,
      desc: content.forward || content.share_list?.wx?.desc,
      img_url: content.img_url,
      link: content.share_list?.wx?.link || content.share_list?.wx_timeline?.link
    };

    // 类型特定字段
    if (type === 'photo') {
      item.title = `ONE |《${content.text_author_info.text_author_work}》`;
      item.work = content.text_author_info.text_author_work;
    } else if (type === 'article') {
      item.title = `阅读|《${content.title}》`;
    } else if (type === 'radio') {
      item.title = `ONE收音机 |《${content.title}》`;
      item.audio_url = content.audio_url;
    }

    result[type] = item;
  });

  return result;
}

async function run() {
  // 获取ONE内容(始终运行)
  const oneInfo = await getONE();
  
  // 获取诗词天气信息(用于面板content)
  const weatherInfo = await getShiciInfo();
  
  // 解析参数
  let oneType = 'radio'; // ONE默认使用电台
  let panelType = 'shici'; // 面板默认使用诗词
  let icon = 'figure.baseball.circle.fill'; // 默认图标
  let iconColor = '#ffbcd9'; // 默认颜色
  let notify = true; // 默认发送通知
  
  try {
    if (typeof $argument !== 'undefined' && $argument) {
      // 处理 argument 字符串格式的参数
      const args = {};
      $argument.split('&').forEach(item => {
        const [key, value] = item.split('=');
        if (value) args[key] = decodeURIComponent(value);
      });
      
      if (args.oneType) oneType = args.oneType;
      if (args.panelType) panelType = args.panelType;
      if (args.icon) icon = args.icon;
      if (args.iconColor) iconColor = args.iconColor;
      if (args.notify) notify = args.notify !== 'false';
    }
  } catch (e) {
    $.logErr('参数解析错误，使用默认设置');
  }

  // 获取ONE内容
  const oneContent = oneInfo[oneType];
  
  // 发送通知(使用ONE内容)
  if (notify) {
    const notificationOptions = {
      "auto-dismiss": 3,
      "open-url": oneType === 'radio' ? 
        (oneContent.audio_url || oneContent.link) : 
        oneContent.link
    };

    if (oneContent.img_url && oneType !== 'radio') {
      notificationOptions["media-url"] = oneContent.img_url;
    }

    if (oneType === 'radio') {
      notificationOptions.action = "view";
    }

    $notification.post(
      oneContent.title,
      oneContent.author + (oneType === 'photo' ? ' ' + oneContent.work : ''),
      oneContent.desc,
      notificationOptions
    );
  }

   // 获取面板标题内容
   let panelTitle = '';
   switch(panelType) {
     case 'shici':
       const shici = await getShici();
       panelTitle = shici.title;
       break;
     case 'yiyan':
       const yiyan = await getYiyan();
       panelTitle = yiyan.title;
       break;
     default:
       panelTitle = oneContent.title;
   }

  // 更新面板(添加图标和颜色配置)
  $done({
    title: panelTitle,
    content: weatherInfo,
    icon: icon,
    "icon-color": iconColor
  });
}

// Main execution - 修复语法
;(async () => {
  try {
    await run()
  } catch (e) {
    $.logErr(e)
  }
})()

// prettier-ignore
function Env(t,s){class e{constructor(t){this.env=t}send(t,s="GET"){t="string"==typeof t?{url:t}:t;let e=this.get;return"POST"===s&&(e=this.post),new Promise((s,i)=>{e.call(this,t,(t,e,r)=>{t?i(t):s(e)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,s){this.name=t,this.http=new e(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,s),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $environment&&$environment["surge-version"]}isLoon(){return"undefined"!=typeof $loon}isShadowrocket(){return"undefined"!=typeof $rocket}isStash(){return"undefined"!=typeof $environment&&$environment["stash-version"]}toObj(t,s=null){try{return JSON.parse(t)}catch{return s}}toStr(t,s=null){try{return JSON.stringify(t)}catch{return s}}getjson(t,s){let e=s;const i=this.getdata(t);if(i)try{e=JSON.parse(this.getdata(t))}catch{}return e}setjson(t,s){try{return this.setdata(JSON.stringify(t),s)}catch{return!1}}getScript(t){return new Promise(s=>{this.get({url:t},(t,e,i)=>s(i))})}runScript(t,s){return new Promise(e=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=s&&s.timeout?s.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,s,i)=>e(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s);if(!e&&!i)return{};{const i=e?t:s;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s),r=JSON.stringify(this.data);e?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(s,r):this.fs.writeFileSync(t,r)}}lodash_get(t,s,e){const i=s.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return e;return r}lodash_set(t,s,e){return Object(t)!==t?t:(Array.isArray(s)||(s=s.toString().match(/[^.[\]]+/g)||[]),s.slice(0,-1).reduce((t,e,i)=>Object(t[e])===t[e]?t[e]:t[e]=Math.abs(s[i+1])>>0==+s[i+1]?[]:{},t)[s[s.length-1]]=e,t)}getdata(t){let s=this.getval(t);if(/^@/.test(t)){const[,e,i]=/^@(.*?)\.(.*?)$/.exec(t),r=e?this.getval(e):"";if(r)try{const t=JSON.parse(r);s=t?this.lodash_get(t,i,""):s}catch(t){s=""}}return s}setdata(t,s){let e=!1;if(/^@/.test(s)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(s),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const s=JSON.parse(h);this.lodash_set(s,r,t),e=this.setval(JSON.stringify(s),i)}catch(s){const o={};this.lodash_set(o,r,t),e=this.setval(JSON.stringify(o),i)}}else e=this.setval(t,s);return e}getval(t){return this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,s){return this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$persistentStore.write(t,s):this.isQuanX()?$prefs.setValueForKey(t,s):this.isNode()?(this.data=this.loaddata(),this.data[s]=t,this.writedata(),!0):this.data&&this.data[s]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,s=(()=>{})){if(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status?e.status:e.statusCode,e.status=e.statusCode),s(t,e,i)});else if(this.isQuanX())this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:r,body:o}=t;s(null,{status:e,statusCode:i,headers:r,body:o},o)},t=>s(t&&t.error||"UndefinedError"));else if(this.isNode()){let e=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,s)=>{try{if(t.headers["set-cookie"]){const e=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();e&&this.ckjar.setCookieSync(e,null),s.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:r,headers:o,rawBody:h}=t,a=e.decode(h,this.encoding);s(null,{status:i,statusCode:r,headers:o,rawBody:h,body:a},a)},t=>{const{message:i,response:r}=t;s(i,r,r&&e.decode(r.rawBody,this.encoding))})}}post(t,s=(()=>{})){const e=t.method?t.method.toLocaleLowerCase():"post";if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[e](t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status?e.status:e.statusCode,e.status=e.statusCode),s(t,e,i)});else if(this.isQuanX())t.method=e,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:r,body:o}=t;s(null,{status:e,statusCode:i,headers:r,body:o},o)},t=>s(t&&t.error||"UndefinedError"));else if(this.isNode()){let i=require("iconv-lite");this.initGotEnv(t);const{url:r,...o}=t;this.got[e](r,o).then(t=>{const{statusCode:e,statusCode:r,headers:o,rawBody:h}=t,a=i.decode(h,this.encoding);s(null,{status:e,statusCode:r,headers:o,rawBody:h,body:a},a)},t=>{const{message:e,response:r}=t;s(e,r,r&&i.decode(r.rawBody,this.encoding))})}}time(t,s=null){const e=s?new Date(s):new Date;let i={"M+":e.getMonth()+1,"d+":e.getDate(),"H+":e.getHours(),"m+":e.getMinutes(),"s+":e.getSeconds(),"q+":Math.floor((e.getMonth()+3)/3),S:e.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(e.getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in i)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[s]:("00"+i[s]).substr((""+i[s]).length)));return t}queryStr(t){let s="";for(const e in t){let i=t[e];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),s+=`${e}=${i}&`)}return s=s.substring(0,s.length-1),s}msg(s=t,e="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()||this.isShadowrocket()||this.isStash()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let s=t.openUrl||t.url||t["open-url"],e=t.mediaUrl||t["media-url"];return{openUrl:s,mediaUrl:e}}if(this.isQuanX()){let s=t["open-url"]||t.url||t.openUrl,e=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":s,"media-url":e,"update-pasteboard":i}}if(this.isSurge()||this.isShadowrocket()||this.isStash()){let s=t.url||t.openUrl||t["open-url"];return{url:s}}}};if(this.isMute||(this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$notification.post(s,e,i,o(r)):this.isQuanX()&&$notify(s,e,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(s),e&&t.push(e),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,s){const e=!this.isSurge()||this.isShadowrocket()&&!this.isQuanX()&&!this.isLoon()&&!this.isStash();e?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(s=>setTimeout(s,t))}done(t={}){const s=(new Date).getTime(),e=(s-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${e} \u79d2`),this.log(),this.isSurge()||this.isShadowrocket()||this.isQuanX()||this.isLoon()||this.isStash()?$done(t):this.isNode()&&process.exit(1)}}(t,s)}













