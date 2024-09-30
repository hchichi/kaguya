/**
 * The function performs streaming service restriction checks for various platforms using async/await
 * and sends notifications with the results.
 * @param countryCode - The code you provided seems to be a refactored version of a script that checks
 * streaming service restrictions based on the user's configuration. It uses async/await for handling
 * asynchronous operations.
 * @returns The code is returning the results of checking various streaming services for country
 * restrictions. The results are formatted and displayed in a notification, including information about
 * the availability of services like Spotify, Netflix, Disney+, TikTok, Bilibili, and Prime Video.
 * Additionally, the code fetches information about a movie from Douban movie calendar and includes it
 * in the notification if available. Finally, the code pushes the
 */
/**
 * Streaming Service Restriction Check - Refactored with async/await
 */

const $ = new Env('Streaming Service Restriction Check');

// Default configuration
const defaultConfig = {
  spotify: true,
  netflix: true,
  disney: true,
  youtube: true,
  tiktok: true,
  bilibili: true,
  primeVideo: true,
  showMovieCalendar: true,
  icon: 'visionpro.badge.play.fill',
  color: '#007aff'
};

// Merge user configuration
let config = defaultConfig;
if (typeof $argument !== 'undefined' && $argument) {
  try {
    const customConfig = JSON.parse($argument);
    config = Object.assign({}, defaultConfig, customConfig);
  } catch (e) {
    console.log('Config parsing error, using default configuration');
  }
}

// Country flag emoji function
function getCountryFlagEmoji(countryCode) {
  if (!countryCode) return '🏴‍☠️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

// Notification function
async function notify(title, subt, desc, opts) {
  console.log(`Sending notification: ${title} | ${subt} | ${desc} | ${JSON.stringify(opts)}`);
  if ($.isNode()) {
    console.log(`${title}\n${subt}\n${desc}\n${JSON.stringify(opts)}`);
  } else if ($.isSurge()) {
    $notification.post(title, subt, desc, {
      url: opts['open-url'] || opts.url,
      'media-url': opts['media-url']
    });
  } else {
    $.msg(title, subt, desc, opts);
  }
}

// Get Douban movie calendar
async function getMovieCalendar() {
  const apiKey = '0ab215a8b1977939201640fa14c66bab';
  const dateStr = $.time('yyyy-MM-dd');
  const url = `https://frodo.douban.com/api/v2/calendar/today?apikey=${apiKey}&date=${dateStr}&alt=json&_sig=tuOyn%2B2uZDBFGAFBLklc2GkuQk4%3D&_ts=1610703479`;

  try {
    const response = await $.http.get({
      url: url,
      headers: {
        'User-Agent': 'api-client/0.1.3 com.douban.frodo/8.0.0'
      }
    });

    const data = JSON.parse(response.body);
    console.log('豆瓣API原始响应:');
    console.log(JSON.stringify(data, null, 2));

    const { comment, subject, today } = data;
    const { rating, card_subtitle, url: movieUrl } = subject;

    // Fetch additional movie details
    const subjectId = subject.id;
    const subjectUrl = `https://movie.douban.com/j/subject_abstract?subject_id=${subjectId}`;
    const subjectResponse = await $.http.get({ url: subjectUrl });
    const subjectData = JSON.parse(subjectResponse.body);

    const movieDetails = subjectData.subject;
    const originalTitle = movieDetails.title.split(/\s+/).slice(1).join(' ').replace(/\s*\(\d{4}\)$/, '');
    const subtype = movieDetails.subtype;
    const duration = movieDetails.duration;
    const releaseYear = movieDetails.release_year;

    let dateComment = `${today.date}｜${comment.content}`;
    if (today.description) {
      dateComment += `｜${today.description}`;
    }

    return {
      id: subject.id,
      chineseTitle: subject.title,
      originalTitle: originalTitle,
      image: subject.pic.large.replace('.webp', '.jpg'),
      rating: rating.value,
      maxRating: rating.max,
      ratingCount: rating.count,
      starCount: rating.star_count,
      datecomment: dateComment,
      comment: comment.content,
      cardSubtitle: card_subtitle.split('\n')[0],
      link: movieUrl,
      year: releaseYear,
      subtype: subtype,
      duration: duration,
      directors: movieDetails.directors.join(' / '),
      genres: movieDetails.types.join(' / ')
    };
  } catch (e) {
    console.log('获取今日推荐影片失败:');
    console.log(e);
    return null;
  }
}

// Check functions
async function checkSpotify() {
  const url = 'https://www.spotify.com/tw/signup';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  try {
    const response = await $.http.get({ url, headers });
    const match = response.body.match(/geoCountry":"([A-Z]{2})/);
    if (match) {
      return `🆂🅿: ☑ ${getCountryFlagEmoji(match[1])} ${match[1]}`;
    } else {
      return '🆂🅿: Check failed';
    }
  } catch (error) {
    return '🆂🅿: Check failed';
  }
}

async function checkNetflix() {
  const url = 'https://www.netflix.com/title/81280792';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  try {
    const response = await $.http.get({ url, headers });
    let region = 'Unknown';
    let isAvailable = false;

    if (response.status === 200) {
      isAvailable = true;
      let locationUrl = response.headers['x-originating-url'];
      if (locationUrl) {
        region = locationUrl.split('/')[3].split('-')[0].toUpperCase();
      }
    } else if (response.status === 403) {
      region = 'Restricted';
    } else if (response.status === 404) {
      isAvailable = true;
    }

    if (isAvailable) {
      if (region !== 'Unknown' && region !== 'Restricted') {
        if (region.toLowerCase() === 'title') {
          region = 'US';
        }
        region = region.slice(0, 2).toUpperCase();
        return `🅽🅵: ☑ ${getCountryFlagEmoji(region)} ${region}`;
      } else {
        return `🅽🅵: Only Originals (${region})`;
      }
    } else {
      return `🅽🅵: ☒ (${region})`;
    }
  } catch (error) {
    return '🅽🅵: Check failed';
  }
}

async function checkDisney() {
  console.log('🅳🅿: Starting check');

  const authorizationHeader = "ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84";
  const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36";

  try {
    // Get Location Info
    const locationResponse = await $.http.post({
      url: "https://disney.api.edge.bamgrid.com/graph/v1/device/graphql",
      headers: {
        "Accept-Language": "en",
        Authorization: `Bearer ${authorizationHeader}`,
        "Content-Type": "application/json",
        "User-Agent": UA
      },
      body: JSON.stringify({
        query: "mutation registerDevice($input: RegisterDeviceInput!) { registerDevice(registerDevice: $input) { grant { grantType assertion } } }",
        variables: {
          input: {
            applicationRuntime: "chrome",
            attributes: {
              browserName: "chrome",
              browserVersion: "94.0.4606",
              manufacturer: "apple",
              model: null,
              operatingSystem: "macintosh",
              operatingSystemVersion: "10.15.7",
              osDeviceIds: []
            },
            deviceFamily: "browser",
            deviceLanguage: "en",
            deviceProfile: "macosx"
          }
        }
      })
    });

    const parsedData = JSON.parse(locationResponse.body);
    if (parsedData?.errors) {
      return '🅳🅿: Check failed';
    }

    const { token: { accessToken }, session: { inSupportedLocation, location: { countryCode } } } = parsedData.extensions.sdk;

    // Test Home Page
    const homePageResponse = await $.http.get({
      url: "https://www.disneyplus.com/",
      headers: {
        "Accept-Language": "en",
        "User-Agent": UA
      }
    });

    if (homePageResponse.status !== 200 || homePageResponse.body.includes("Sorry, Disney+ is not available in your region.")) {
      return '🅳🅿: Check failed';
    }

    const region = countryCode;
    if (inSupportedLocation) {
      return `🅳🅿: ☑ ${getCountryFlagEmoji(region)} ${region}`;
    } else {
      return `🅳🅿: ☒ ${getCountryFlagEmoji(region)} ${region}`;
    }

  } catch (error) {
    console.log(`🅳🅿: Check failed - ${error}`);
    return '🅳🅿: Check failed';
  }
}

async function checkTikTok() {
  const url = 'https://www.tiktok.com/';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  try {
    const response = await $.http.get({ url, headers });

    const postResponse = await $.http.post({
      url: 'https://www.tiktok.com/passport/web/store_region/',
      headers
    });

    const data = JSON.parse(postResponse.body);
    const region = data.data.store_region;

    if (region === 'cn') {
      return `🆃🆃: 由抖音提供服务 ${getCountryFlagEmoji(region)} ${region.toUpperCase()}`;
    } else {
      return `🆃🆃: ☑ ${getCountryFlagEmoji(region)} ${region.toUpperCase()}`;
    }
  } catch (e) {
    return '🆃🆃: Check failed';
  }
}

async function checkBilibili() {
  const zoneUrl = 'https://api.bilibili.com/x/web-interface/zone';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  try {
    // Step 1: Get zone information
    const zoneResponse = await $.http.get({ url: zoneUrl, headers });
    const zoneData = JSON.parse(zoneResponse.body);
    const { addr, country_code } = zoneData.data;

    // Step 2: Verify IP Information
    try {
      const ipInfoUrl = `https://ipvx.netart.cn/${addr}`;
      const ipResponse = await $.http.get({ url: ipInfoUrl, headers });
      const ipData = JSON.parse(ipResponse.body);
      console.log(`Bilibili IP Verification Info: ${JSON.stringify(ipData)}`);
    } catch (e) {
      console.log(`Bilibili: IP Information Verification Failed (${e})`);
    }

    // Step 3: Get Country Information
    const countryInfoUrl = `https://moviecal.vercel.app/api/country?callingCode=${country_code}`;
    const countryResponse = await $.http.get({ url: countryInfoUrl, headers });
    const countryData = JSON.parse(countryResponse.body);

    if (!Array.isArray(countryData) || countryData.length === 0) {
      return 'Bilibili: Check failed (Incomplete country information)';
    }

    const alpha2Code = countryData[0].alpha2Code;
    const countryName = countryData[0].name;
    const countryFlag = getCountryFlagEmoji(alpha2Code);

    // Supported country codes
    const supportedCountries = ['CN', 'TW', 'HK', 'MO'];

    if (supportedCountries.includes(alpha2Code)) {
      return `🅱🅻: ☑ ${countryFlag} ${alpha2Code}`;
    } else {
      return `🅱🅻: ☒ ${countryFlag} (${countryName})`;
    }

  } catch (e) {
    return '🅱🅻: Check failed';
  }
}

async function checkPrimeVideo() {
  const url = 'https://www.primevideo.com';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  try {
    const response = await $.http.get({ url, headers });
    const match = response.body.match(/"currentTerritory":"([A-Z]{2})"/);
    if (match) {
      return `🅿🆅: ☑ ${getCountryFlagEmoji(match[1])} ${match[1]}`;
    } else {
      return '🅿🆅: ☒';
    }
  } catch (error) {
    return '🅿🆅: Check failed';
  }
}

// Main function
(async () => {
  const timeout = 5000; // 5 seconds timeout

  // Timeout helper
  const withTimeout = async (fn, ms) => {
    return Promise.race([
      fn(),
      new Promise(resolve => setTimeout(() => resolve('Check timeout'), ms))
    ]);
  };

  // Collect all checks based on configuration
  const checks = [];
  if (config.spotify) checks.push(withTimeout(checkSpotify, timeout));
  if (config.netflix) checks.push(withTimeout(checkNetflix, timeout));
  if (config.disney) checks.push(withTimeout(checkDisney, timeout));
  if (config.youtube) {
    // Implement checkYouTube similarly if needed
    // checks.push(withTimeout(checkYouTube, timeout));
  }
  if (config.tiktok) checks.push(withTimeout(checkTikTok, timeout));
  if (config.bilibili) checks.push(withTimeout(checkBilibili, timeout));
  if (config.primeVideo) checks.push(withTimeout(checkPrimeVideo, timeout));

  // Execute all checks concurrently
  const results = await Promise.all(checks);

  const resultText = results.join('\n');
  console.log(resultText);

  // New code to format the results
  const formattedResults = results.reduce((acc, result) => {
    const [service, info] = result.split(': ');
    acc[service] = info;
    return acc;
  }, {});

  const compactContent = [
    `SP:${formattedResults['🆂🅿']} | NF:${formattedResults['🅽🅵']} | DP:${formattedResults['🅳🅿']}`,
    `TT:${formattedResults['🆃🆃']} | BL:${formattedResults['🅱🅻']} | PV:${formattedResults['🅿🆅']}`
  ].join('\n');

  let title = 'Streaming Service Restriction Check';
  let movieInfo = null;

  // Get Douban movie calendar
  if (config.showMovieCalendar) {
    movieInfo = await getMovieCalendar();
    if (movieInfo) {
      //title = `🍿 ${movieInfo.rating}/${movieInfo.maxRating}✰ ${movieInfo.chineseTitle}\n  ${movieInfo.comment}`;
      title = `🍿 「豆瓣」电影: ${movieInfo.rating} | ${movieInfo.chineseTitle}`;
      /**
      \n👉🏻 电影短评: ${movieInfo.comment}
      */
    }
  }

  // Send notification
  if (movieInfo) {
    const stars = '⭐'.repeat(Math.round(movieInfo.starCount));
    const notificationTitle = `${movieInfo.chineseTitle} | ${stars}`;
    
    let notificationSubtitle = `${movieInfo.originalTitle} (${movieInfo.year})`;
    if (movieInfo.subtype === 'Movie' && movieInfo.duration) {
      notificationSubtitle += ` | ${movieInfo.duration}`;
    } else if (movieInfo.subtype === 'TV') {
      notificationSubtitle += ` | ${movieInfo.subtype}剧集`;
    }
    
    const notificationBody = [
      `📊 评分: ${movieInfo.rating}/${movieInfo.maxRating} (${movieInfo.ratingCount}人评价)`,
      `🎬 导演: ${movieInfo.directors}`,
      `🎭 类型: ${movieInfo.genres}`,
      `📖 简介: ${movieInfo.cardSubtitle}`,
      `📅 ${movieInfo.datecomment}`
    ].join('\n');
    
    console.log('Movie info found, sending notification with movie details');
    await notify(notificationTitle, notificationSubtitle, notificationBody, {
      'open-url': movieInfo.link,
      'media-url': movieInfo.image
    });
  } else {
    console.log('No movie info found, sending notification with only check results');
    await notify(title, '', resultText, {});
  }

  // Push to Surge panel
  $done({
    title: title,
    content: compactContent,
    icon: config.icon,
    'icon-color': config.color
  });
})();

// Country flag emoji function
function getCountryFlagEmoji(countryCode) {
  if (!countryCode) return '🏴‍☠️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

// prettier-ignore
function Env(t,s){class e{constructor(t){this.env=t}send(t,s="GET"){t="string"==typeof t?{url:t}:t;let e=this.get;return"POST"===s&&(e=this.post),new Promise((s,i)=>{e.call(this,t,(t,e,r)=>{t?i(t):s(e)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,s){this.name=t,this.http=new e(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,s),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $environment&&$environment["surge-version"]}isLoon(){return"undefined"!=typeof $loon}isShadowrocket(){return"undefined"!=typeof $rocket}isStash(){return"undefined"!=typeof $environment&&$environment["stash-version"]}toObj(t,s=null){try{return JSON.parse(t)}catch{return s}}toStr(t,s=null){try{return JSON.stringify(t)}catch{return s}}getjson(t,s){let e=s;const i=this.getdata(t);if(i)try{e=JSON.parse(this.getdata(t))}catch{}return e}setjson(t,s){try{return this.setdata(JSON.stringify(t),s)}catch{return!1}}getScript(t){return new Promise(s=>{this.get({url:t},(t,e,i)=>s(i))})}runScript(t,s){return new Promise(e=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=s&&s.timeout?s.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,s,i)=>e(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s);if(!e&&!i)return{};{const i=e?t:s;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),s=this.path.resolve(process.cwd(),this.dataFile),e=this.fs.existsSync(t),i=!e&&this.fs.existsSync(s),r=JSON.stringify(this.data);e?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(s,r):this.fs.writeFileSync(t,r)}}lodash_get(t,s,e){const i=s.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return e;return r}lodash_set(t,s,e){return Object(t)!==t?t:(Array.isArray(s)||(s=s.toString().match(/[^.[\]]+/g)||[]),s.slice(0,-1).reduce((t,e,i)=>Object(t[e])===t[e]?t[e]:t[e]=Math.abs(s[i+1])>>0==+s[i+1]?[]:{},t)[s[s.length-1]]=e,t)}getdata(t){let s=this.getval(t);if(/^@/.test(t)){const[,e,i]=/^@(.*?)\.(.*?)$/.exec(t),r=e?this.getval(e):"";if(r)try{const t=JSON.parse(r);s=t?this.lodash_get(t,i,""):s}catch(t){s=""}}return s}setdata(t,s){let e=!1;if(/^@/.test(s)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(s),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const s=JSON.parse(h);this.lodash_set(s,r,t),e=this.setval(JSON.stringify(s),i)}catch(s){const o={};this.lodash_set(o,r,t),e=this.setval(JSON.stringify(o),i)}}else e=this.setval(t,s);return e}getval(t){return this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,s){return this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$persistentStore.write(t,s):this.isQuanX()?$prefs.setValueForKey(t,s):this.isNode()?(this.data=this.loaddata(),this.data[s]=t,this.writedata(),!0):this.data&&this.data[s]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,s=(()=>{})){if(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status?e.status:e.statusCode,e.status=e.statusCode),s(t,e,i)});else if(this.isQuanX())this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:r,body:o}=t;s(null,{status:e,statusCode:i,headers:r,body:o},o)},t=>s(t&&t.error||"UndefinedError"));else if(this.isNode()){let e=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,s)=>{try{if(t.headers["set-cookie"]){const e=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();e&&this.ckjar.setCookieSync(e,null),s.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:r,headers:o,rawBody:h}=t,a=e.decode(h,this.encoding);s(null,{status:i,statusCode:r,headers:o,rawBody:h,body:a},a)},t=>{const{message:i,response:r}=t;s(i,r,r&&e.decode(r.rawBody,this.encoding))})}}post(t,s=(()=>{})){const e=t.method?t.method.toLocaleLowerCase():"post";if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[e](t,(t,e,i)=>{!t&&e&&(e.body=i,e.statusCode=e.status?e.status:e.statusCode,e.status=e.statusCode),s(t,e,i)});else if(this.isQuanX())t.method=e,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:e,statusCode:i,headers:r,body:o}=t;s(null,{status:e,statusCode:i,headers:r,body:o},o)},t=>s(t&&t.error||"UndefinedError"));else if(this.isNode()){let i=require("iconv-lite");this.initGotEnv(t);const{url:r,...o}=t;this.got[e](r,o).then(t=>{const{statusCode:e,statusCode:r,headers:o,rawBody:h}=t,a=i.decode(h,this.encoding);s(null,{status:e,statusCode:r,headers:o,rawBody:h,body:a},a)},t=>{const{message:e,response:r}=t;s(e,r,r&&i.decode(r.rawBody,this.encoding))})}}time(t,s=null){const e=s?new Date(s):new Date;let i={"M+":e.getMonth()+1,"d+":e.getDate(),"H+":e.getHours(),"m+":e.getMinutes(),"s+":e.getSeconds(),"q+":Math.floor((e.getMonth()+3)/3),S:e.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(e.getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in i)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[s]:("00"+i[s]).substr((""+i[s]).length)));return t}queryStr(t){let s="";for(const e in t){let i=t[e];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),s+=`${e}=${i}&`)}return s=s.substring(0,s.length-1),s}msg(s=t,e="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()||this.isShadowrocket()||this.isStash()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let s=t.openUrl||t.url||t["open-url"],e=t.mediaUrl||t["media-url"];return{openUrl:s,mediaUrl:e}}if(this.isQuanX()){let s=t["open-url"]||t.url||t.openUrl,e=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":s,"media-url":e,"update-pasteboard":i}}if(this.isSurge()||this.isShadowrocket()||this.isStash()){let s=t.url||t.openUrl||t["open-url"];return{url:s}}}};if(this.isMute||(this.isSurge()||this.isShadowrocket()||this.isLoon()||this.isStash()?$notification.post(s,e,i,o(r)):this.isQuanX()&&$notify(s,e,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(s),e&&t.push(e),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,s){const e=!this.isSurge()||this.isShadowrocket()&&!this.isQuanX()&&!this.isLoon()&&!this.isStash();e?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(s=>setTimeout(s,t))}done(t={}){const s=(new Date).getTime(),e=(s-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${e} \u79d2`),this.log(),this.isSurge()||this.isShadowrocket()||this.isQuanX()||this.isLoon()||this.isStash()?$done(t):this.isNode()&&process.exit(1)}}(t,s)}


