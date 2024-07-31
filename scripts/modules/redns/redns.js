!(async () => {
  let quote = await getQuote();
  let weather = await getWeather();

  let traffic = await httpAPI("/v1/traffic", "GET");
  let dateNow = new Date();
  let dateTime = Math.floor(traffic.startTime * 1000);
  let startTime = timeTransform(dateNow, dateTime);

  const STARTTIME = transformFont(startTime, TABLE, INDEX);
  const WEATHER = transformFont(weather, TABLE, INDEX);
  
  let panel = {
    title: `❀ | ${WEATHER}\n❀ | ${quote}`,
    //icon: 'shield.lefthalf.filled.badge.checkmark',
    icon: 'opticid.fill',
    //'icon-color': '#CD853F',
    'icon-color': '#318ce7',
  };

  if ($trigger == "button") {
    await httpAPI("/v1/profiles/reload");
    await httpAPI("/v1/dns/flush");
  }
  
  let dnsCache = await getDNSCache();
  let delay = ((await httpAPI("/v1/test/dns_delay")).delay * 1000).toFixed(0);
  const DNS = transformFont(dnsCache, TABLE, INDEX);
  const DELAY = transformFont(delay, TABLE, INDEX);

  panel.content = `𝑺𝑻𝑨𝑹𝑻𝑬𝑫: ${STARTTIME} | 𝑫𝑵𝑺: ${DELAY} 𝒎𝒔${DNS}`;

  $done(panel);
})();

function timeTransform(dateNow, dateTime) {
  let dateDiff = dateNow - dateTime;
  let days = Math.floor(dateDiff / (24 * 3600 * 1000)); //计算出相差天数
  let leave1 = dateDiff % (24 * 3600 * 1000); //计算天数后剩余的毫秒数
  let hours = Math.floor(leave1 / (3600 * 1000)); //计算出小时数
  let leave2 = leave1 % (3600 * 1000); //计算小时数后剩余的毫秒数
  let minutes = Math.floor(leave2 / (60 * 1000)); //计算相差分钟数
  let leave3 = leave2 % (60 * 1000); //计算分钟数后剩余的毫秒数
  let seconds = Math.round(leave3 / 1000);

  if (days == 0) {
    if (hours == 0) {
      if (minutes == 0) return `${seconds}`;
      return `${minutes}:${seconds}`;
    }
    return `${hours}:${minutes}:${seconds}`;
  } else {
    return `${days} · ${hours}:${minutes}`;
  }
}

async function getDNSCache() {
  let dnsCache = (await httpAPI("/v1/dns", "GET")).dnsCache;
  return [...new Set(dnsCache.map((d) => "\n" + d.server))].join("");
  }

function httpAPI(path = "", method = "POST", body = null) {
  return new Promise((resolve) => {
    $httpAPI(method, path, body, (result) => {
      resolve(result);
    });
  });
}

async function getQuote() {
  return new Promise((resolve, reject) => {
    $httpClient.get("https://international.v1.hitokoto.cn/?c=j&c=e&c=f&c=e&c=g&max_length=15", function(error, response, data) {
      if (error) {
        console.error(`Failed to fetch quote: ${error}`);
        resolve("見面吧，就現在。");
        return;
      }
      
      if (response.status !== 200) {
        console.error(`Failed to fetch quote. Status code: ${response.status}`);
        resolve("見面吧，就現在。");
        return;
      }
      
      let jsonData = JSON.parse(data);
      let hitokoto = jsonData.hitokoto;
      let from = jsonData.from;
      let from_who = jsonData.from_who;
      let result = from_who ? `${hitokoto} \n                  / ${from_who} 《${from}》` : `${hitokoto}\n                  / 《${from}》`;
      resolve(result);
    });
  });
}

async function getWeather() {
  return new Promise((resolve, reject) => {
    $httpClient.get('https://api.vvhan.com/api/weather', function(error, response, data) {
      if (error) {
        console.error(`Failed to fetch weather: ${error}`);
        resolve("天氣好的話，我會去找你。");
        return;
      }
      if (response.status !== 200) {
        console.error(`Failed to fetch weather. Status code: ${response.status}`);
        resolve("天氣好的話，我會去找你。");
        return;
      }
      let parsedData = JSON.parse(data);
      if (parsedData.success) {
        let weatherInfo = parsedData.data;
        let week = weatherInfo.week.replace('星期', '周');
        let result = `${parsedData.city.replace(/市$/, '')}·${week}·${weatherInfo.type} · ${weatherInfo.low}-${weatherInfo.high} · 🈳:${parsedData.air.aqi}\n❀ | ${parsedData.tip}`;
        resolve(result);
      } else {
        console.error('Failed to fetch weather data');
        resolve("天氣好的話，我會去找你。");
      }
    });
  });
}

// const TABLE = {
// 	"monospace-regular": ["𝟶", "𝟷", "𝟸", "𝟹", "𝟺", "𝟻", "𝟼", "𝟽", "𝟾", "𝟿", 
//  "𝘢", "𝘣", "𝘤", "𝘥", "𝘦", "𝘧", "𝘨", "𝘩", "𝘪", "𝘫", // a-j
//  "𝘬", "𝘭", "𝘮", "𝘯", "𝘰", "𝘱", "𝘲", "𝘳", "𝘴", "𝘵", // k-t
//  "𝘶", "𝘷", "𝘸", "𝘹", "𝘺", "𝘻", // u-z
//  "𝘈", "𝘉", "𝘊", "𝘋", "𝘌", "𝘍", "𝘎", "𝘏", "𝘐", "𝘑", // A-J
//  "𝘒", "𝘓", "𝘔", "𝘕", "𝘖", "𝘗", "𝘘", "𝘙", "𝘚", "𝘛", // K-T
//  "𝘜", "𝘝", "𝘞", "𝘟", "𝘠", "𝘡"  // U-Z
// ]
// };
const TABLE = {
	"monospace-regular": [
	  "𝟎", "𝟏", "𝟐", "𝟑", "𝟒", "𝟓", "𝟔", "𝟕", "𝟖", "𝟗", // 0-9
	  "𝒂", "𝒃", "𝒄", "𝒅", "𝒆", "𝒇", "𝒈", "𝒉", "𝒊", "𝒋", // a-j
	  "𝒌", "𝒍", "𝒎", "𝒏", "𝒐", "𝒑", "𝒒", "𝒓", "𝒔", "𝒕", // k-t
	  "𝒖", "𝒗", "𝒘", "𝒙", "𝒚", "𝒛", // u-z
	  "𝑨", "𝑩", "𝑪", "𝑫", "𝑬", "𝑭", "𝑮", "𝑯", "𝑰", "𝑱", // A-J
	  "𝑲", "𝑳", "𝑴", "𝑵", "𝑶", "𝑷", "𝑸", "𝑹", "𝑺", "𝑻", // K-T
	  "𝑼", "𝑽", "𝑾", "𝑿", "𝒀", "𝒁"  // U-Z
	]
  };
  
  // 索引对象
  const INDEX = {};
  for (let i = 48; i <= 57; i++) INDEX[i] = i - 48; // 数字 0-9
  for (let i = 65; i <= 90; i++) INDEX[i] = i - 65 + 36; // 大写字母 A-Z
  for (let i = 97; i <= 122; i++) INDEX[i] = i - 97 + 10; // 小写字母 a-z
  
  // 字体转换函数
  function transformFont(str, table, index) {
    return str.replace(/[a-zA-Z0-9]/g, c => {
      const code = c.charCodeAt(0).toString();
      const idx = index[code];
      return table["monospace-regular"][idx] || c;
    });
  }