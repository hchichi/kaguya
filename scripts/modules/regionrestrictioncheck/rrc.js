let icon = "visionpro.badge.play.fill";
let successColor = "#1e4d2b", failColor = "#ff3800";
let quote = true, movie = true, bili = true, disney = true, netflix = true, youtube = true;
let myTitle = false, myTitleContent = "";
let result = {
  title: "",
  content: "",
  icon: icon,
  "icon-color": successColor
};

if (typeof $argument != "undefined" && $argument != "") {
  var args = parseArgs($argument);

  icon = args.icon || icon;
  successColor = args.successColor || successColor;
  failColor = args.failColor || failColor;
  quote = args.quote === "false" || args.quote === "0" ? false : (args.quote === "true" || args.quote === "1" ? true : quote);
  movie = args.movie === "false" || args.movie === "0" ? false : (args.movie === "true" || args.movie === "1" ? true : movie);
  bili = args.bili === "false" || args.bili === "0" ? false : (args.bili === "true" || args.bili === "1" ? true : bili);
  disney = args.disney === "false" || args.disney === "0" ? false : (args.disney === "true" || args.disney === "1" ? true : disney);
  netflix = args.netflix === "false" || args.netflix === "0" ? false : (args.netflix === "true" || args.netflix === "1" ? true : netflix);
  youtube = args.youtube === "false" || args.youtube === "0" ? false : (args.youtube === "true" || args.youtube === "1" ? true : youtube);
  myTitle = args.myTitle === "true" || args.myTitle === "1" ? true : false;
  myTitleContent = args.myTitleContent || "";

  result.icon = icon;
}

function parseArgs(argument) {  
  var argPairs = argument.split("&");
  var args = {};
  
  for (var i = 0; i < argPairs.length; i++) {
    var pair = argPairs[i].split("=");
    var key = decodeURIComponent(pair[0]);
    var value = pair.length > 1 ? decodeURIComponent(pair[1]) : "";

    args[key] = value;
  }

  return args;
}

const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
  "Accept-Language": "en"
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36";

(async () => {  
  let content = "";
  let movieData = movie ? await getMovie() : null;
  let [quoteContent, ...extraContent] = await Promise.all([
    quote ? getQuote() : "",   
    youtube ? check_youtube() : "", 
    netflix ? check_netflix() : "",    
    disney ? check_disneyplus() : "",  
    bili ? check_bilibili() : "",  
  ]);

  if (movie && movieData) {  
    const { title, link, image, rating, comment } = movieData;  
    const titleInfo = `${title} - 豆瓣电影详情`;  
    const subtitleInfo = `评分：${rating}`;  
    const bodyInfo = `短评：${comment}`;

    $notification.post(titleInfo, subtitleInfo, bodyInfo, {  
      "open-url": link,  
      "media-url": image  
    });
  }

  const validContents = extraContent.filter(content => content.trim() !== '');

  const combinedContent = validContents.map(content => {
    // 使用正则表达式匹配小写的国家代码并将其转换为大写
    return content.replace(/([\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF])\s([a-z]{2})/g, (match, p1, p2) => {
      return `${p1} ${p2.toUpperCase()}`;
    }).trim();
  }).join('\n');
  
  
  
    content = combinedContent ? combinedContent + (content ? "\n" + content : "") : content;
    let titleContent = quoteContent ? quoteContent : "";
    let title = myTitle && myTitleContent ? myTitleContent : titleContent;
  
    let iconColor = extraContent.every(item => item && item.includes("✔️")) ? successColor : failColor;
    let result = {
      title,
      content,
      icon,
      "icon-color": iconColor
    };
  
    $done(result);
  })().catch((e) => { 
    console.error("处理异常：", e);
    $done({
      content: "众生皆苦，唯有自渡。\n" + e.message,
      icon: "error"
    });
  });

  async function check_youtube() {
    let youtube_check_result = "𝚈𝙾𝚄𝚃𝚄𝙱𝙴: ";
  
    const inner_check = () => {
      return new Promise((resolve, reject) => {
        let option = {
          url: "https://www.youtube.com/premium",
          headers: REQUEST_HEADERS
        };
        $httpClient.get(option, function (error, response, data) {
          if (error != null || response.status !== 200) {
            reject("Error");
            return;
          }
          if (data.indexOf("Premium is not available in your country") !== -1) {
            resolve("\u2612 BAD"); // Unicode for ☒
            return;
          }
          let region = "";
          let re = new RegExp('"countryCode":"(.*?)"', "gm");
          let result = re.exec(data);
          if (result != null && result.length === 2) {
            region = result[1].toUpperCase(); // Ensure region code is uppercase
          } else if (data.indexOf("www.google.cn") !== -1) {
            region = "CN";
          } else {
            region = "US";
          }
          resolve(`\u2611 GOOD | ${getFlagEmoji(region)}`); // Unicode for ☑
        });
      });
    }
  
    try {
      const result = await inner_check();
      youtube_check_result += result;
    } catch (error) {
      youtube_check_result += "N/A"; // Error case, representing with N/A
    }
    return youtube_check_result;
  }
  


  async function check_netflix() {
    let netflix_check_result = "𝙽𝙴𝚃𝙵𝙻𝙸𝚇: ";
  
    const inner_check = (filmId) => {
      return new Promise((resolve, reject) => {
        let option = {
          url: "https://www.netflix.com/title/" + filmId,
          headers: REQUEST_HEADERS
        };
        $httpClient.get(option, function (error, response, data) {
          if (error != null) {
            reject("Error");
            return;
          }
          if (response.status === 403) {
            reject("Not Available");
            return;
          }
          if (response.status === 404) {
            resolve("Not Found");
            return;
          }
          if (response.status === 200) {
            let url = response.headers["x-originating-url"];
            let region = url.split("/")[3];
            region = region.split("-")[0];
            if (region == "title") {
              region = "us";
            }
            resolve(`\u2611 GOOD | ${getFlagEmoji(region)}`); // Unicode for ☑
            return;
          }
          reject("Error");
        });
      });
    }
  
    try {
      const code1 = await inner_check(80062035);
      if (code1 === "Not Found") {
        const code2 = await inner_check(80018499);
        netflix_check_result +=
          code2 === "Not Found"
            ? "\u2612 BAD" // Unicode for
            : `\u26A0 Limited | ${getFlagEmoji(code2)}`; // Unicode for ⚠️
      } else {
        netflix_check_result += code1;
      }
    } catch (error) {
      netflix_check_result += "N/A"; // Error case, representing with N/A
    }
    return netflix_check_result;
  }
  

  async function check_disneyplus() {
    let disney_check_result = "𝙳𝙸𝚂𝙽𝙴𝚈+: ";
  
    const authorizationHeader = "ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84";
    const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36";
  
    const getLocationInfo = async () => {
      const opts = {
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
      };
  
      return new Promise((resolve, reject) => {
        $httpClient.post(opts, (error, response, data) => {
          if (error) {
            reject("Error");
            return;
          }
  
          if (response.status !== 200) {
            reject("Not Available");
            return;
          }
  
          const parsedData = JSON.parse(data);
          if (parsedData?.errors) {
            reject("Not Available");
            return;
          }
  
          const {
            token: { accessToken },
            session: {
              inSupportedLocation,
              location: { countryCode }
            }
          } = parsedData.extensions.sdk;
  
          resolve({ inSupportedLocation, countryCode, accessToken });
        });
      });
    };
  
    const testHomePage = async () => {
      const opts = {
        url: "https://www.disneyplus.com/",
        headers: {
          "Accept-Language": "en",
          "User-Agent": UA
        }
      };
  
      return new Promise((resolve, reject) => {
        $httpClient.get(opts, (error, response, data) => {
          if (error) {
            reject("Error");
            return;
          }
          if (response.status !== 200 || data.includes("Sorry, Disney+ is not available in your region.")) {
            reject("Not Available");
            return;
          }
          const match = data.match(/Region: ([A-Za-z]{2})[\s\S]*?CNBL: ([12])/);
          if (!match) {
            resolve({ region: "", cnbl: "" });
            return;
          }
  
          const [region, cnbl] = [match[1], match[2]];
          resolve({ region, cnbl });
        });
      });
    };
  
    try {
      const homePageResult = await Promise.race([testHomePage(), timeout(7000)]);
      const locationInfo = await Promise.race([getLocationInfo(), timeout(7000)]);
      const region = locationInfo.countryCode || homePageResult.region;
  
      if (locationInfo.inSupportedLocation) {
        disney_check_result += `\u2611 GOOD | ${getFlagEmoji(region)}`; // Unicode for ☑
      //} else if (homePageResult.cnbl === "1") {
      //  disney_check_result += `\u2691 Coming Soon ${getFlagEmoji(region)}`; // Unicode for ⚑
      } else {
        disney_check_result += "\u2612 BAD"; // Unicode for ☒
      }
    } catch (error) {
      disney_check_result += "N/A"; // Error case, representing with N/A
    }
  
    return disney_check_result;
  }
  

async function check_bilibili() {
  let bilibili_check_result = "𝙱𝙸𝙻𝙸𝙸𝙶𝙲: ";

  const check = (url) => {
    return new Promise((resolve, reject) => {
      let option = {
        url: url,
        headers: REQUEST_HEADERS
      };
      $httpClient.get(option, function (error, response, data) {
        if (error != null || response.status !== 200) {
          reject("Error");
          return;
        }
        let result = JSON.parse(data);
        resolve(result);
      });
    });
  }

  let countryCode = null;
  let ipInfo = null;

  try {
    const getCountryCode = async () => {
      return new Promise((resolve, reject) => {
        let option = {
          url: "https://api.bilibili.com/x/web-interface/zone",
          headers: REQUEST_HEADERS
        };
        $httpClient.get(option, function (error, response, data) {
          if (error != null || response.status !== 200) {
            reject("Error");
            return;
          }
          let result = JSON.parse(data);
          if (result.code === 0) {
            let ip = result.data.addr;
            let option = {
              url: `http://ip-api.com/json/${ip}`,
              headers: REQUEST_HEADERS
            };
            $httpClient.get(option, function (error, response, data) {
              if (error != null || response.status !== 200) {
                reject("Error");
                return;
              }
              ipInfo = JSON.parse(data);
              resolve(ipInfo.countryCode);
            });
          } else {
            reject("Error");
          }
        });
      });
    }

    countryCode = await getCountryCode();
    const flag = getFlagEmoji(countryCode);

    const [mainlandResult, hkmctwResult, twResult] = await Promise.all([
      check(
        "https://api.bilibili.com/pgc/player/web/playurl?avid=82846771&qn=0&type=&otype=json&ep_id=307247&fourk=1&fnver=0&fnval=16"
      ),
      check(
        "https://api.bilibili.com/pgc/player/web/playurl?avid=18281381&cid=29892777&qn=0&type=&otype=json&ep_id=183799&fourk=1&fnver=0&fnval=16"
      ),
      check(
        "https://api.bilibili.com/pgc/player/web/playurl?avid=50762638&cid=100279344&qn=0&type=&otype=json&ep_id=268176&fourk=1&fnver=0&fnval=16"
      )
    ]);

    if (twResult.code === 0 && twResult.result && twResult.result.dash) {
      bilibili_check_result += `\u2611 GOOD | ${flag}`;
    } else if (
      hkmctwResult.code === 0 &&
      hkmctwResult.result &&
      hkmctwResult.result.dash
    ) {
      bilibili_check_result += `\u2611 GOOD | ${flag}`;
    } else if (
      mainlandResult.code === 0 &&
      mainlandResult.result &&
      mainlandResult.result.dash
    ) {
      bilibili_check_result += `\u2611 GOOD | ${flag}`;
    } else {
      //bilibili_check_result += `⛔️ Only available outside CN/HK/MO/TW ${flag}`;
      bilibili_check_result += `\u26A0 Limited | ${flag}`;

    }
  } catch (error) {
    console.log("Error:", error);
    bilibili_check_result += "N/A";
  }

  console.log(
    `\n` +
    `🌐  ${ipInfo.query}\n` +
    `🗺️  ${ipInfo.country} (${ipInfo.countryCode})\n` +
    `🏙️  ${ipInfo.region}, ${ipInfo.city}\n` +
    `🕸️  ${ipInfo.as} ${ipInfo.org}`
  );

  return bilibili_check_result;
}

async function getQuote() {
  return new Promise((resolve, reject) => {
    const url = "https://v1.hitokoto.cn/?c=a&c=b&c=c&c=h&c=j&c=d";

    const REQUEST_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    };

    const options = {
      url: url,
      headers: REQUEST_HEADERS
    };

    $httpClient.get(options, function (error, response, data) {
      if (error) {
        console.log("请求 Hitokoto 数据失败: ", error.message || error);
        reject(error);
        return;
      }
      if (response.status !== 200) {
        console.log(`Hitokoto 数据请求失败: HTTP 状态码 ${response.status}`);
        reject(new Error(`请求失败. HTTP 状态码: ${response.status}`));
        return;
      }

      // 记录返回的完整内容
      console.log("Hitokoto 数据请求成功，返回的完整数据: ", data);

      try {
        let jsonData = JSON.parse(data);
        let content = jsonData.hitokoto;
        let from = jsonData.from;
        let author = jsonData.from_who;

        let result;
        if (author) {
          result = `${content}- 《${from}》 • ${author}`;
        } else {
          result = `${content}- 《${from}》`;
        }
        resolve(result);
      } catch (parseError) {
        console.log("解析 Hitokoto 数据时出错: ", parseError.message || parseError);
        reject(parseError);
      }
    });
  });
}

async function getMovie() {
  const url = "https://moviecal.vercel.app/api/movie";  
  return new Promise((resolve, reject) => {
    $httpClient.get(url, (error, response, data) => {
        if (error) {
            console.log("请求电影数据失败: ", error);
            reject("请求电影数据失败");
            return;
        }
        const { title, link, image, rating, comment } = JSON.parse(data);

        const titleInfo = `${title} - 豆瓣电影详情`;
        const subtitleInfo = `评分：${rating}`;
        const bodyInfo = `短评：${comment}`;

        $notification.post(titleInfo, subtitleInfo, bodyInfo, {
            "open-url": link,
            "media-url": image
        });

        console.log(`已发送通知：${title}`);
        resolve({ title, link, image, rating, comment });
    });
  });
}

function timeout(delay = 5000) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject("Timeout");
    }, delay);
  });
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}
