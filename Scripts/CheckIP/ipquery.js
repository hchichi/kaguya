const NAME = 'network-info'
const $ = new Env(NAME)

let arg
if (typeof $argument != 'undefined') {
  arg = Object.fromEntries($argument.split('&').map(item => item.split('=')))
} else {
  arg = {}
}
$.log(`传入的 $argument: ${$.toStr(arg)}`)

arg = { ...arg, ...$.getjson(NAME, {}) }

$.log(`从持久化存储读取参数后: ${$.toStr(arg)}`)

if (!isPanel()) {
  $.log(`参数为空 非面板的情况下, 修正运行环境`)
  $.lodash_set(arg, 'TYPE', 'EVENT')
}

if (isRequest()) {
  arg = { ...arg, ...parseQueryString($request.url) }
  $.log(`从请求后读取参数后: ${$.toStr(arg)}`)
}

let result = {}
let proxy_policy = ''
let title = ''
let content = ''
!(async () => {
  if ($.lodash_get(arg, 'TYPE') === 'EVENT') {
    const eventDelay = parseFloat($.lodash_get(arg, 'EVENT_DELAY') || 3)
    $.log(`网络变化, 等待 ${eventDelay} 秒后开始查询`)
    if (eventDelay) {
      await $.wait(1000 * eventDelay)
    }
  }

  let SSID = ''
  if (typeof $network !== 'undefined') {
    $.log($.toStr($network))
    if ($.lodash_get(arg, 'SSID') == 1) {
      SSID = $.lodash_get($network, 'wifi.ssid')
    }
  }
  if (SSID) {
    SSID = `SSID: ${SSID}\n\n`
  } else {
    SSID = ''
  }
  let [
    { CN_IP = '', CN_INFO = '', CN_POLICY = '', CN_IP_V6 = '', CN_INFO_V6 = '' } = {},
    proxyRequestInfo = {},
  ] = await Promise.all([
    getDirectRequestInfo(),
    getProxyRequestInfo($.lodash_get(arg, 'LANDING_IPv4')),
  ])
  
    // 根据传入参数判断是否获取IPv6信息
    if ($.lodash_get(arg, 'IPv6')) {  
      let ipv6Result = await getDirectInfoIPv6($.lodash_get(arg, 'DOMESTIC_IPv6', 'zxinc'))
      CN_IP_V6 = ipv6Result.CN_IP_V6
      CN_INFO_V6 = ipv6Result.CN_INFO_V6
    }
    
  let { PROXY_IP = '', PROXY_INFO = '', PROXY_PRIVACY = '', PROXY_POLICY = '', ENTRANCE_IP = '' } = proxyRequestInfo
  
  if (($.lodash_get(arg, 'PRIVACY') || '1') === '1' && PROXY_PRIVACY) {
    PROXY_PRIVACY = `\n${PROXY_PRIVACY}`
  }
  
  let ENTRANCE = ''
  if (ENTRANCE_IP) {
    const { IP: resolvedIP } = await resolveDomain(ENTRANCE_IP)
    if (resolvedIP) {
      $.log(`入口域名解析: ${ENTRANCE_IP} ➟ ➬ ➬ ${resolvedIP}`)
      ENTRANCE_IP = resolvedIP
    }
  }
  if (ENTRANCE_IP && ENTRANCE_IP !== PROXY_IP) {
    const entranceDelay = parseFloat($.lodash_get(arg, 'ENTRANCE_DELAY') || 0)
    $.log(`入口: ${ENTRANCE_IP} 与落地 IP: ${PROXY_IP} 不一致, 等待 ${entranceDelay} 秒后查询入口`)
    if (entranceDelay) {
      await $.wait(1000 * entranceDelay)
    }
    let [{ CN_INFO: ENTRANCE_INFO1 = '', isCN = false } = {}, { PROXY_INFO: ENTRANCE_INFO2 = '' } = {}] = await Promise.all([
      getDirectInfo(ENTRANCE_IP),
      getProxyInfo(ENTRANCE_IP, $.lodash_get(arg, 'LANDING_IPv4')),
    ])
    // 国内接口的国外 IP 解析过于离谱 排除掉
    if (ENTRANCE_INFO1 && isCN) {
      ENTRANCE = `🅴: ${maskIP(ENTRANCE_IP) || '-'}\n${maskAddr(ENTRANCE_INFO1)}`
    }
    if (ENTRANCE_INFO2) {
      if (ENTRANCE) {
        ENTRANCE = `${ENTRANCE.replace(/^(.*?):/gim, '$1¹:')}\n${maskAddr(ENTRANCE_INFO2.replace(/^(.*?):/gim, '$1²:'))}`
      } else {
        ENTRANCE = `🅴: ${maskIP(ENTRANCE_IP) || '-'}\n${maskAddr(ENTRANCE_INFO2)}`
      }
    }
  }
  if (ENTRANCE) {
    ENTRANCE = `${ENTRANCE}\n\n`
  }

  if (CN_POLICY === 'DIRECT') {
    CN_POLICY = ``
  } else {
    CN_POLICY = `Policy: ${maskAddr(CN_POLICY) || '-'}\n`
  }

  if (CN_INFO) {
    CN_INFO = `\n${CN_INFO}`
  }
  if (PROXY_POLICY === 'DIRECT') {
    PROXY_POLICY = `Outbound: DIRECT`
  } else if (PROXY_POLICY) {
    PROXY_POLICY = `Outbound: ${maskAddr(PROXY_POLICY) || '-'}`
  } else {
    PROXY_POLICY = ''
  }
  if (PROXY_POLICY) {
    proxy_policy = PROXY_POLICY
  } else {
    proxy_policy = ''
  }

  if (CN_INFO_V6) {
    CN_INFO_V6 = `\n${CN_INFO_V6}`
  }

  if (PROXY_INFO) {
    PROXY_INFO = `\n${PROXY_INFO}`
  }
  title = `${PROXY_POLICY}`
  content = `${SSID}${CN_POLICY}④: ${maskIP(CN_IP) || '-'}${maskAddr(CN_INFO)}${CN_IP_V6 ? `\n⑥:${maskIP(CN_IP_V6) || '-'}${maskAddr(CN_INFO_V6)}` : ''}\n\n${ENTRANCE}🅻: ${maskIP(PROXY_IP) || '-'}${maskAddr(PROXY_INFO)}${PROXY_PRIVACY}`  
  //if (!isPanel()) {
  //  content = `${content}\nRuntime: ${new Date().toTimeString().split(' ')[0]}`
  //}
  if (isPanel()) {
  content = `${content}\nDONE: ${new Date().toTimeString().split(' ')[0]}`
  }

  title = title || '入我相思门 知我相思苦'
  if (!isPanel()) {
    if ($.lodash_get(arg, 'TYPE') === 'EVENT') {
await notify(
  `🄳 ${maskIP(CN_IP) || '-'}${CN_IP_V6 ? ` 🄳 ${maskIP(CN_IP_V6) || '-'}` : ''} 🅿 ${maskIP(PROXY_IP) || '-'}`,
  `${maskAddr(CN_INFO.replace(/(位置|网络).*?:/g, '').replace(/\n/g, ''))}${CN_INFO_V6 ? `\n${maskAddr(CN_INFO_V6.replace(/(位置|网络).*?:/g, '').replace(/\n/g, ''))}` : ''}`,
  `${PROXY_INFO.match(/GEO: [^\n]+/)[0]} | ${PROXY_INFO.match(/ASN: [^\n]+/)[0]}`
);
    } else {
      await notify('入我相思门 知我相思苦', title, content)
    }
  }
})()
.catch(async e => {
  $.logErr(e)
  $.logErr($.toStr(e))
  const msg = `${$.lodash_get(e, 'message') || $.lodash_get(e, 'error') || e}`
  title = `❌`
  content = msg
  await notify('入我相思门 知我相思苦', title, content)
})
.finally(async () => {
  if (isRequest()) {
    result = {
      response: {
        status: 200,
        body: JSON.stringify(
          {
            title,
            content,
          },
          null,
          2
        ),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST,GET,OPTIONS,PUT,DELETE',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        },
      },
    }
  } else {
    result = { title, content, ...arg }
  }
  $.log($.toStr(result))
  if (isPanel()) {
    const html = `<div style="font-family: -apple-system; font-size: large">${`\n${content}${
      proxy_policy ? `\n\n${proxy_policy.replace(/^(.*?:\s*)(.*)$/, '$1<span style="color: #467fcf">$2</span>')}` : ''
    }`.replace(/^(.*?):/gim, '<span style="font-weight: bold">$1</span>:').replace(/\n/g, '<br/>')}</div>`
    $.done(result)
  } else {
    $.done(result)
  }
})

async function getDirectRequestInfo() {  
  const { CN_IP, CN_INFO } = await getDirectInfo(undefined, $.lodash_get(arg, 'DOMESTIC_IPv4'))  
  const { POLICY } = await getRequestInfo(  
    new RegExp(`ip\.zxinc\.org|https:\/\/api\.ip\.plus|ip\.im|ws\.126\.net|pingan\.com\.cn|cip\.cc|ipservice\.ws\.126\.net|webapi-pc\.meitu\.com|ip\.useragentinfo\.com`)
  )  
  return { CN_IP, CN_INFO, CN_POLICY: POLICY }  
}

async function getProxyRequestInfo(provider) {
  const { PROXY_IP, PROXY_INFO, PROXY_PRIVACY } = await getProxyInfo(undefined, provider)
  const result = await getRequestInfo(/ipapi\.is|ip-api\.com|ipinfo\.io|api-ipv4\.ip\.sb|ip\.im|api\.my-ip\.io|ip-score\.com|ip\.fm/)
  return {
    PROXY_IP,
    PROXY_INFO,
    PROXY_PRIVACY,
    PROXY_POLICY: $.lodash_get(result, 'POLICY'),
    ENTRANCE_IP: $.lodash_get(result, 'IP'),
  }
}

async function getRequestInfo(regexp) {
  let POLICY = ''
  let IP = ''

  try {
    if ($.isSurge()) {
      const { requests } = await httpAPI('/v1/requests/recent', 'GET')
      const request = requests.slice(0, 10).find(i => regexp.test(i.URL))
      POLICY = request.policyName
      if (/\(Proxy\)/.test(request.remoteAddress)) {
        IP = request.remoteAddress.replace(/\s*\(Proxy\)\s*/, '')
      }
    }
  } catch (e) {
    $.logErr(`从最近请求中获取 ${regexp} 发生错误: ${e.message || e}`)
  }

  return {
    POLICY,
    IP,
  }
}

async function getDirectInfo(ip, provider = 'meituip') {
  let CN_IP
  let CN_INFO
  const msg = `使用 ${provider} 查询 ${ip ? ip : '分流'} 信息`
  try {
    switch (provider) {
      case 'ipim':
        const ipInfo = await ipim(ip)
        CN_IP = ipInfo.IP
        CN_INFO = ipInfo.INFO
        break
          case 'uai':
          const ipUAI = await uai(ip)
          CN_IP = ipUAI.IP
          CN_INFO = ipUAI.INFO
          break
      case 'ipplus':
        const ipPlus = await ipplus(ip)
        CN_IP = ipPlus.IP
        CN_INFO = ipPlus.INFO
        break
        cipcc
      case 'cipcc':
        const cipCC = await cipcc(ip)
        CN_IP = cipCC.IP
        CN_INFO = cipCC.INFO
        break
      case 'pinganip':
        const pingAn = await pinganip(ip)
        CN_IP = pingAn.IP
        CN_INFO = pingAn.INFO
        break
      case 'neteaseip':
        const netease = await neteaseip(ip)
        CN_IP = netease.IP
        CN_INFO = netease.INFO
        break
      case 'meituip':
        const meitu = await meituip(ip)
        CN_IP = meitu.IP
        CN_INFO = meitu.INFO
      case 'zxinc':
      default:
        const zxInfo = await zxinc(ip)
        CN_IP = zxInfo.IP
        CN_INFO = zxInfo.INFO
        break
    }
  } catch (e) {
    $.logErr(`${msg} 发生错误: ${e.message || e}`)
  }
  return { CN_IP, CN_INFO: simplifyAddr(CN_INFO) }
}

async function getDirectInfoIPv6(provider = 'zxinc') {
  let CN_IP_V6 = ''
  let CN_INFO_V6 = ''

  try {
    switch (provider) {
      case 'ipwcn':
        const ipwcnInfo = await http({
          url: 'http://6.ipw.cn/api/ip/myip?json',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.14',
          },
        })
        const ipwcnBody = JSON.parse(ipwcnInfo.body)
        CN_IP_V6 = ipwcnBody.ip
        const ipwcnDetail = await http({
          url: `https://rest.ipw.cn/api/aw/v1/ipv6?ip=${CN_IP_V6}&warning=please-direct-use-please-use-ipplus360.com`,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.14',
          },
        })
        const ipwcnDetailBody = JSON.parse(ipwcnDetail.body)
        CN_INFO_V6 = `${getflag('CN')} ${ipwcnDetailBody.data.district}, ${ipwcnDetailBody.data.city}, ${ipwcnDetailBody.data.prov} - ${ipwcnDetailBody.data.owner} (${ipwcnDetailBody.data.isp})`
        break
      case 'zxinc':
      default:
        const zxincInfo = await http({
          url: 'https://v6.ip.zxinc.org/info.php?type=json',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.14',
          },
        })
        const zxincBody = JSON.parse(zxincInfo.body)
        CN_IP_V6 = zxincBody.data.myip
        const zxincDetail = await http({
          url: `https://ip.zxinc.org/api.php?type=json&ip=${CN_IP_V6}`,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.14',
          },
        })
        const zxincDetailBody = JSON.parse(zxincDetail.body)
        const country = zxincDetailBody.data.country.split('\t').slice(1).join(' - ')
        const local = zxincDetailBody.data.local.split('\t').join(' - ')
        
        CN_INFO_V6 = [
          country ? `位置: ${country}` : '',
          local ? `网络: ${local}` : '',
        ].filter(i => i).join('\n')
        break
    }
  } catch (e) {
    $.logErr(`使用 ${provider} 查询 IPv6 信息发生错误: ${e.message || e}`)
  }

  return { CN_IP_V6, CN_INFO_V6 }
}

async function getProxyInfo(ip, provider = 'ipapiis') {
  let PROXY_IP
  let PROXY_INFO
  let PROXY_PRIVACY
  const msg = `使用 ${provider} 查询 ${ip ? ip : '分流'} 信息`
  try {
    switch (provider) {
      case 'ipinfo':
        const ipInfo = await ipinfo(ip)
        PROXY_IP = ipInfo.PROXY_IP
        PROXY_INFO = ipInfo.PROXY_INFO
        PROXY_PRIVACY = ipInfo.PROXY_PRIVACY
        break
      case 'ipapi':
        const ipApi = await ipapi(ip)
        PROXY_IP = ipApi.PROXY_IP
        PROXY_INFO = ipApi.PROXY_INFO
        PROXY_PRIVACY = ipApi.PROXY_PRIVACY
        break
      case 'ipsb':
        const ipSB = await ipsb(ip)
        PROXY_IP = ipSB.PROXY_IP
        PROXY_INFO = ipSB.PROXY_INFO
        PROXY_PRIVACY = ipSB.PROXY_PRIVACY
        break
      case 'ipscore':
        const ipScore = await ipscore(ip)
        PROXY_IP = ipScore.PROXY_IP
        PROXY_INFO = ipScore.PROXY_INFO
        PROXY_PRIVACY = ipScore.PROXY_PRIVACY
        break
      case 'ipfm':
        const ipFM = await ipfm(ip)
        PROXY_IP = ipFM.PROXY_IP
        PROXY_INFO = ipFM.PROXY_INFO
        PROXY_PRIVACY = ipFM.PROXY_PRIVACY
        break
      case 'ipapiis':
      default:
        const ipApiIs = await ipapiis(ip)
        PROXY_IP = ipApiIs.PROXY_IP
        PROXY_INFO = ipApiIs.PROXY_INFO
        PROXY_PRIVACY = ipApiIs.PROXY_PRIVACY
        break
    }
  } catch (e) {
    $.logErr(`${msg} 发生错误: ${e.message || e}`)
  }
  return { PROXY_IP, PROXY_INFO: simplifyAddr(PROXY_INFO), PROXY_PRIVACY }
}

async function pinganip(ip) {
  let IP = ''
  let location = ''
  let isp = ''
  let INFO = ''

  try {
    // 使用平安IP地址查询接口获取IP信息
    const res = await http({
      url: `https://rmb.pingan.com.cn/itam/mas/linden/ip/request`,
      params: { ip },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      }
    })
    const data = JSON.parse(res.body)

    if (data && data.data) {
      IP = data.data.ip || ''
      location = `${data.data.region}${data.data.city !== data.data.region ? data.data.city : ''}`.trim()
      isp = data.data.isp || ''
    }

    if (IP) {
      INFO = `位置: ${location}
网络: ${isp}`
    } else {
      $.logErr(`从平安IP地址查询接口获取IP信息失败: ${JSON.stringify(data)}`)
    }
  } catch (e) {
    $.logErr(`使用平安IP地址查询接口查询 ${ip} 信息发生错误: ${e.message || e}`)
  }

  return { IP, INFO }
}
async function neteaseip(ip) {
  let IP = ''
  let province = ''
  let city = ''
  let isp = ''
  let INFO = ''

  try {
    // 使用网易126的 API 获取 IP 信息
    const res = await http({
      url: `https://ipservice.ws.126.net/locate/api/getLocByIp?${ip ? `&ip=${encodeURIComponent(ip)}` : ''}`,
    })
    const data = JSON.parse(res.body)

    if (data && data.status === 200 && data.result) {
      IP = data.result.ip || ''
      province = data.result.province
      city = data.result.city
      isp = data.result.operator

      // 构建位置信息
      const location = province === city ? city : `${province} - ${city}`

      INFO = [
        `位置: ${location}`,
        `网络: ${isp || '-'}`,
      ].filter(i => i).join('\n')
    } else {
      $.logErr(`从网易126 API 获取 IP 信息失败: ${JSON.stringify(data)}`)
    }
  } catch (e) {
    $.logErr(`使用网易126 API 查询 ${ip} 信息发生错误: ${e.message || e}`)
  }

  return { IP, INFO }
}
async function meituip(ip) {
  let IP = ''
  let city = ''
  let province = ''
  let isp = ''
  let INFO = ''

  try {
    // 使用美图的 API 获取 IP 信息
    const res = await http({
      url: `https://webapi-pc.meitu.com/common/ip_location${ip ? `?ip=${encodeURIComponent(ip)}` : ''}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.14',
      },
    })
    const data = JSON.parse(res.body)

    if (data && data.code === 0 && data.data) {
      IP = ip || Object.keys(data.data)[0]
      const ipData = data.data[IP]
      city = ipData.city
      province = ipData.province
      isp = ipData.isp

      // 构建位置信息
      const location = city === province ? city : `${city} ${province.replace(city, '').trim()}`

      INFO = [
        `位置: ${location}`, 
        `网络: ${isp || '-'}`, 
      ].filter(i => i).join('\n')
    } else {
      $.logErr(`从美图 API 获取 IP 信息失败: ${JSON.stringify(data)}`)
    }
  } catch (e) {
    $.logErr(`使用美图 API 查询 ${ip} 信息发生错误: ${e.message || e}`)
  }

  return { IP, INFO }
}
async function zxinc(ip) {
  let isCN = false
  let IP = ''
  let INFO = ''

  try {
    // 先调用 http://v4.ip.zxinc.org/info.php?type=json 获取 IP 信息
    const initialRes = await http({
      url: 'https://v4.ip.zxinc.org/info.php?type=json',
    })
    let initialBody = String($.lodash_get(initialRes, 'body'))
    try {
      initialBody = JSON.parse(initialBody)
    } catch (e) {}
    IP = $.lodash_get(initialBody, 'data.myip') || ''

    if (IP) {
      // 使用获取到的 IP 值再进行查询
      const res = await http({
        url: `https://ip.zxinc.org/api.php?type=json&ip=${encodeURIComponent(IP)}`,
      })
      let body = String($.lodash_get(res, 'body'))
      try {
        body = JSON.parse(body)
      } catch (e) {}
      let country = $.lodash_get(body, 'data.country') || ''
      let local = $.lodash_get(body, 'data.local') || ''

      isCN = country.includes('中国')

      // 去掉 "省" 和 "市" 字样
      country = country.replace(/(省|市)$/, '')

      // 提取网络信息
      let network = local.split('/').join(' - ')

      INFO = [
        `位置: ${country}`,
        network ? `网络: ${network}` : '',
      ].filter(i => i).join('\n')
    } else {
      $.logErr(`从 https://v4.ip.zxinc.org/info.php?type=json 获取 IP 信息失败: ${JSON.stringify(initialBody)}`)
    }
  } catch (e) {
    $.logErr(`使用 ip.zxinc.org 查询 ${ip ? ip : '分流'} 信息发生错误: ${e.message || e}`)
  }

  return { IP, INFO, isCN }
}
async function cipcc(ip) {
  let isCN = false
  let IP = ''
  let INFO = ''

  try {
    const res = await http({
      url: `https://www.cip.cc/${ip ? encodeURIComponent(ip) : ''}`,
    })
    let body = String($.lodash_get(res, 'body'))

    // 提取 IP 信息
    IP = body.match(/IP\s*:\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)?.[1] || ''

    // 提取地址信息
    let location = body.match(/地址\s*:\s*(.+)/)?.[1] || ''
    isCN = location.includes('中国')

    // 提取网络信息
    let network = body.match(/数据二\s*:\s*.+\|\s*(.+)/)?.[1] || ''

    INFO = [
      location ? `位置: ${location}` : '',
      network ? `网络: ${network}` : '',
    ].filter(i => i).join('\n')
  } catch (e) {
    $.logErr(`使用 www.cip.cc 查询 ${ip ? ip : '分流'} 信息 发生错误: ${e.message || e}`)
  }

  return { IP, INFO, isCN }
}
async function uai() {
  let isCN = false;
  let IP = '';
  let INFO = '';

  try {
      // 发起 HTTP 请求以获取当前 IP 的直连信息
      const res = await http({
          url: `https://ip.useragentinfo.com/json`,
          headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2)',
              'Content-Type': 'application/json'
          }
      });
      let body = JSON.parse(res.body);  // 假设 http 是一个异步方法，返回一个包含 body 的响应对象
      
      if (body.code !== 200) {
          throw new Error(`查询失败: ${body.desc}`);
      }

      // 解析获取的信息
      IP = body.ip;
      const province = body.province; // "北京市"
      const city = body.city; // "朝阳区"
      const isp = body.isp; // "联通"

      // 检查是否位于中国
      isCN = body.country.includes('中国');
      
      // 格式化输出信息
      INFO = `位置: ${province} - ${city}\n网络: ${isp}`;

  } catch (e) {
      console.error(`查询用户代理信息发生错误: ${e}`);
      INFO = `查询发生错误: ${e.message || e}`;
  }

  return { IP, INFO, isCN };
}
async function ipplus(ip) {
  let isCN = false 
  let IP = ''
  let INFO = ''

  try {
    const res = await http({
      url: `https://api.ip.plus/${ip ? `?q=${encodeURIComponent(ip)}` : 'ip'}`,
    })
    let body = String($.lodash_get(res, 'body'))
    try {
      body = JSON.parse(body)
    } catch (e) {}
    
    if (body.code !== 200) {
      throw new Error(`查询失败: ${body.message}`)
    }

    body = body.data
    IP = ip || body.ip
    
    let countryInfo = $country.code(body.country_code)
    let country = countryInfo.name
    let subdivisions = $locality.provinceByCode(`${body.country_code}-${body.subdivisions}`) || body.subdivisions
    let city = $locality.cityByLatLong(body.latitude, body.longitude) || body.city

    isCN = countryInfo.cn

    INFO = [
      ['GEO:', isCN ? getflag('CN') : '', country, subdivisions, city].filter(i => i).join(' ')
    ].filter(i => i).join('\n')
  } catch (e) {
    $.logErr(`使用 api.ip.plus 查询 ${ip ? ip : '分流'} 信息 发生错误: ${e.message || e}`)
  }

  return { IP, INFO, isCN }
}
// 代理IP查询API

async function ipapi(ip) {
  let PROXY_IP = '';
  let PROXY_INFO = '';
  let PROXY_PRIVACY = '';

  try {
    const res = await http({
      url: `http://ip-api.com/json/${ip ? `${ip}` : ''}?fields=66846719`,
    });
    let body = String($.lodash_get(res, 'body'));
    try {
      body = JSON.parse(body);
    } catch (e) {}
    
    if (body.status !== 'success') {
      throw new Error(`查询失败: ${body.message}`);
    }

    PROXY_IP = ip || body.query;
    
    let flag = getflag(body.countryCode);
    let country = body.countryCode;
    let region = body.regionName;
    let city = body.city;
    
    let location = [
      flag,
      region,
      city,
      country
    ].filter(i => i).join(', ');
    

    let asn = body.as.split(' ')[0];
    let org = body.org;
    let asname = body.asname;
    
    let company = [
      asn,
      `${org} (${asname})`
    ].filter(i => i).join(' | ');

    PROXY_INFO = [
      location ? `GEO: ${location}` : undefined, 
      company ? `ASN: ${company}` : undefined
    ].filter(i => i).join('\n');

    let privacy = [];
    if (body.mobile) privacy.push('Mobile');
    if (body.proxy) privacy.push('Proxy');
    if (body.hosting) privacy.push('Hosting');

    if (privacy.length > 0) {
      let detected = privacy.join(' | ');
      let emoji = privacy.length > 1 ? '❗️' : '❕';
      PROXY_PRIVACY = `REP: ${detected} ${emoji}`;
    } else {
      PROXY_PRIVACY = 'REP: Clear ✔️';
    }
  } catch (e) {
    $.logErr(`使用 ip-api.com 查询 ${ip ? ip : '分流'} 信息 发生错误: ${e.message || e}`);
  }

  return { PROXY_IP, PROXY_INFO, PROXY_PRIVACY };
}
async function ipim(ip) {
  let isCN
  let IP
  let INFO

  try {
    const res = await http({
      url: `https://ip.im/${ip ? encodeURIComponent(ip) : 'info'}`,
      headers: { 'User-Agent': 'curl/7.16.3 (powerpc-apple-darwin9.0) libcurl/7.16.3' },
    })
    let body = String($.lodash_get(res, 'body'))
    IP = body.match(/(^|\s+)Ip\s*(:|：)\s*(.*)/m)?.[3]
    const country = body.match(/(^|\s+)Country\s*(:|：)\s*(.*)/m)?.[3]
    const province =
      body.match(/(^|\s+)Province\s*(:|：)\s*(.*)/m)?.[3] || body.match(/(^|\s+)Region\s*(:|：)\s*(.*)/m)?.[3]
    const city = body.match(/(^|\s+)City\s*(:|：)\s*(.*)/m)?.[3]
    const district = body.match(/(^|\s+)Districts\s*(:|：)\s*(.*)/m)?.[3]
    const isp = body.match(/(^|\s+)Isp\s*(:|：)\s*(.*)/m)?.[3]
    const org = body.match(/(^|\s+)Org\s*(:|：)\s*(.*)/m)?.[3]

    isCN = country.includes('中国')

    INFO = [
      `GEO: ${[isCN ? getflag('CN') : getflag(country), country, province, city, district].filter(i => i).join(' | ')}`,
      `ASN: ${isp || '-'}`,
      $.lodash_get(arg, 'ORG') == 1 ? `ORG: ${org || '-'}` : undefined,
    ]
      .filter(i => i)
      .join('\n')
  } catch (e) {
    $.logErr(`使用 ip.im 查询 ${ip ? ip : '分流'} 信息 发生错误: ${e.message || e}`)
  }

  return { IP, INFO, isCN }
}
async function ipinfo(ip) {
  let PROXY_IP = ''
  let PROXY_INFO = ''
  let PROXY_PRIVACY = ''

  try {
    const res = await http({
      url: `https://ipinfo.io/widget/${ip ? `${ip}` : ''}`,
    })
    let body = String($.lodash_get(res, 'body'))
    try {
      body = JSON.parse(body)
    } catch (e) {}
    
    PROXY_IP = ip || body.ip
    
    let flag = getflag(body.country)
    let location = [
      flag,
      body.country,
      body.region,
      body.city
    ].filter(i => i).join(' | ')

    let company = [
      `AS${body.asn.asn}`,
      `${body.company.name} (${body.asn.name})`
    ].filter(i => i).join(' | ')

    PROXY_INFO = [
      location ? `GEO: ${location}` : undefined,
      company ? `ASN: ${company}` : undefined
    ].filter(i => i).join('\n')

    let privacyType = body.asn.type || body.company.type || ''
    privacyType = privacyType.charAt(0).toUpperCase() + privacyType.slice(1)
    
    let privacy = []
    if (body.privacy.proxy || body.privacy.relay) privacy.push('Proxy | Relay')
    if (body.privacy.vpn || body.privacy.tor) privacy.push('TOR | VPN')

    if (privacy.length > 0) {
      let detected = privacy.join(' & ')
      if (privacy.includes('TOR | VPN')) detected += ' ❗️'
      else detected += ' ❕'
      PROXY_PRIVACY = `REP: ${privacyType} | ${detected}`
    } else {
      PROXY_PRIVACY = `REP: ${privacyType} ✔️`
    }
  } catch (e) {
    $.logErr(`使用 ipinfo.io 查询 ${ip ? ip : '分流'} 信息 发生错误: ${e.message || e}`)
  }

  return { PROXY_IP, PROXY_INFO, PROXY_PRIVACY }
}
async function ipapiis(ip) {
  let PROXY_IP = '';
  let PROXY_INFO = '';
  let PROXY_PRIVACY = '';

  try {
    const res = await http({
      url: `https://api.ipapi.is/${ip ? `?q=${encodeURIComponent(ip)}` : ''}`,
    });
    let body = String($.lodash_get(res, 'body'));
    try {
      body = JSON.parse(body);
    } catch (e) {}
    
    PROXY_IP = ip || body.ip;
    
    let country = body.location.country;
    let countryCode = body.location.country_code;
    let state = body.location.state;
    let city = body.location.city;
    
    let location = [
      city,
      state,
      `(${countryCode})`
    ].filter(i => i).join(', ');

    let asn = body.asn.asn;
    let org = body.asn.org;
    let net = `${body.asn.route} (${body.asn.domain})`;
    let abu = `${body.asn.abuse || '-'}`;
    let typ = `${body.asn.type.charAt(0).toUpperCase() + body.asn.type.slice(1)}`;
    if (body.is_datacenter) typ += ' DC';
    
    PROXY_INFO = [
      `ASN: AS${asn} (${org})`,
      //`ORG: ${org}`,
      `NET: ${net}`,
      `ABU: ${abu}`,
      `TYP: ${typ}`,
      `GEO: ${location}`
    ].join('\n');

    let privacy = [];
    if (body.is_proxy) privacy.push('Proxy');
    if (body.is_vpn) privacy.push('VPN');
    if (body.is_tor) privacy.push('Tor');
    if (body.is_abuser) privacy.push('ABUSER');
    if (body.is_bogon) privacy.push('Bogon');
    if (body.is_mobile) privacy.push('Mobile');

    if (privacy.length > 0) {
      let detected = privacy.join(' ');
      let score = parseFloat(body.company.abuser_score.split(' ')[0]) * 100;
      let level = score >= 70 ? 'BAD' : score >= 30 ? 'WARN' : 'GOOD';
      let reputation = `${level} (Threat Score ${score.toFixed(0)}%)`;
      let emoji = level === 'BAD' ? '❌' : level === 'WARN' ? '⚠️' : '✔️';
      PROXY_PRIVACY = `REP: ${emoji} ${reputation} ${detected}`;
    } else {
      PROXY_PRIVACY = 'REP: ✔️ GOOD';
    }
  } catch (e) {
    $.logErr(`使用 ipapi.is 查询 ${ip ? ip : '分流'} 信息 发生错误: ${e.message || e}`);
  }

  return { PROXY_IP, PROXY_INFO, PROXY_PRIVACY };
}
async function ipsb(ip) {
  let PROXY_IP = '';
  let PROXY_INFO = '';
  let PROXY_PRIVACY = '';
  try {
    const res = await http({
      url: `https://api-ipv4.ip.sb/geoip${ip ? `/${ip}` : ''}`,
    });
    let body = String($.lodash_get(res, 'body'));
    try {
      body = JSON.parse(body);
    } catch (e) {}
    PROXY_IP = ip || body.ip;
    let flag = getflag(body.country_code);
    let location = [
      flag,
      [body.city, body.region_code, body.country].filter(i => i).join(', '),
    ].filter(i => i).join(' ');
    let company = [
      `AS${body.asn}`,
      `${body.isp} (${body.asn_organization})`,
    ].filter(i => i).join(' | ');
    PROXY_INFO = [
      location ? `GEO: ${location}` : undefined,
      company ? `ASN: ${company}` : undefined,
    ].filter(i => i).join('\n');
    //PROXY_PRIVACY = 'REP: - ❕';
  } catch (e) {
    $.logErr(`使用 api-ipv4.ip.sb 查询 ${ip ? ip : '分流'} 信息 发生错误: ${e.message || e}`);
  }
  return { PROXY_IP, PROXY_INFO, PROXY_PRIVACY };
}
async function ipfm(ip) {
  let PROXY_IP = '';
  let PROXY_INFO = '';
  let PROXY_PRIVACY = '';

  try {
    const res = await http({
      url: `https://api.ip.fm/${ip ? `?q=${encodeURIComponent(ip)}` : 'ip'}`,
    });
    let body = String($.lodash_get(res, 'body'));
    try {
      body = JSON.parse(body);
    } catch (e) {}
    
    if (body.code !== 200) {
      throw new Error(`查询失败: ${body.message}`);
    }

    body = body.data;
    PROXY_IP = ip || body.ip;
    
    let country = body.country;
    let countryCode = body.country_code;
    let state = body.subdivisions;
    let city = body.city;
    
    let location = [
      city,
      state,
      `(${countryCode})`
    ].filter(i => i).join(', ');

    let asn = body.asn;
    let org = body.as_name;
    let domain = body.as_domain;
    
    PROXY_INFO = [
      `ASN: ${asn} (${org})`,
      `ORG: ${org}`,
      `DOM: ${domain}`,
      `GEO: ${location}`
    ].join('\n');

    //PROXY_PRIVACY = 'REP: ✔️ GOOD';
  } catch (e) {
    $.logErr(`使用 api.ip.fm 查询 ${ip ? ip : '分流'} 信息 发生错误: ${e.message || e}`);
  }

  return { PROXY_IP, PROXY_INFO, PROXY_PRIVACY };
}
async function ipscore(ip) {
  let PROXY_IP = '';
  let PROXY_INFO = '';
  let PROXY_PRIVACY = '';
  try {
    const res = await http({
      url: `https://ip-score.com/fulljson${ip ? `?ip=${ip}` : ''}`,
    });
    let body = String($.lodash_get(res, 'body'));
    try {
      body = JSON.parse(body);
    } catch (e) {}
    PROXY_IP = ip || body.ip;
    let flag = getflag(body.geoip2.countrycode);
    let location = [
      flag,
      [body.geoip2.city, body.geoip2.region, body.geoip2.country].filter(i => i).join(', '),
    ].filter(i => i).join(' ');
    let company = [
      body.asn,
      `${body.isp} (${body.org})`,
    ].filter(i => i).join(' | ');
    PROXY_INFO = [
      location ? `GEO: ${location}` : undefined,
      company ? `ASN: ${company}` : undefined,
    ].filter(i => i).join('\n');
    let privacy = [];
    if (body.blacklists.spamhaus !== 'clear') privacy.push(`Spamhaus ${body.blacklists.spamhaus} ❕`);
    if (body.blacklists.sorbs !== 'clear') privacy.push(`SORBS ${body.blacklists.sorbs} ❕`);
    if (body.blacklists.spamcop !== 'clear') privacy.push(`Spamcop ${body.blacklists.spamcop} ❕`);
    if (body.blacklists.southkoreannbl !== 'clear') privacy.push(`KNSBL ${body.blacklists.southkoreannbl} ❕`);
    if (body.blacklists.barracuda !== 'clear') privacy.push(`Barracuda ${body.blacklists.barracuda} ❕`);
    if (privacy.length > 0) {
      PROXY_PRIVACY = `REP: ${privacy.join(' ')}`;
    } else {
      PROXY_PRIVACY = 'REP: Clear ✔️';
    }
  } catch (e) {
    $.logErr(`使用 ip-score.com 查询 ${ip ? ip : '分流'} 信息 发生错误: ${e.message || e}`);
  }
  return { PROXY_IP, PROXY_INFO, PROXY_PRIVACY };
}
function simplifyAddr(addr) {
  if (!addr) return ''
  return addr
    .split(/\n/)
    .map(i => Array.from(new Set(i.split(/\ +/))).join(' '))
    .join('\n')
}

function maskAddr(addr) {
  if (!addr) return ''
  if ($.lodash_get(arg, 'MASK') == 1) {
    let result = ''
    const parts = addr.split(' ')

    if (parts.length >= 3) {
      // 如果有两个或更多的空格,按空格分组后将中间的部分替换为"*"
      result = [parts[0], '*', parts[parts.length - 1]].join(' ')
    } else {
      // 如果空格少于2个,将字符串三等分,将中间的部分替换为"*"
      const third = Math.floor(addr.length / 3)
      result = addr.substring(0, third) + '*'.repeat(third) + addr.substring(2 * third)
    }
    return result
  } else {
    return addr
  }
}

function maskIP(ip) {
  if (!ip) return ''
  if ($.lodash_get(arg, 'MASK') == 1) {
    let result = ''
    if (ip.includes('.')) {
      // IPv4
      let parts = ip.split('.')
      result = [...parts.slice(0, 2), '*', '*'].join('.')
    } else {
      // IPv6
      let parts = ip.split(':')
      result = [...parts.slice(0, 4), '*', '*', '*', '*'].join(':')
    }
    return result
  } else {
    return ip
  }
}

function getflag(countryCode) {
  if ($.lodash_get(arg, 'FLAG', 1) != 1) {
    return '';
  }
  try {
    const flagOffset = 127397;
    const codePoints = [...countryCode.toUpperCase()].map(
      char => flagOffset + char.charCodeAt()
    );
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '';
  }
}

function parseQueryString(url) {
  const queryString = url.split('?')[1] // 获取查询字符串部分
  const regex = /([^=&]+)=([^&]*)/g // 匹配键值对的正则表达式
  const params = {}
  let match

  while ((match = regex.exec(queryString))) {
    const key = decodeURIComponent(match[1]) // 解码键
    const value = decodeURIComponent(match[2]) // 解码值
    params[key] = value // 将键值对添加到对象中
  }

  return params
}

const DOMAIN_RESOLVERS = {
  google: async function (domain, type) {
    const resp = await http({
      url: `https://8.8.4.4/resolve`,
      params: {
        name: domain,
        type: type === 'IPv6' ? 'AAAA' : 'A',
      },
      headers: {
        accept: 'application/dns-json',
      },
    })
    const body = JSON.parse(resp.body)
    if (body['Status'] !== 0) {
      throw new Error(`Status is ${body['Status']}`)
    }
    const answers = body['Answer']
    if (answers.length === 0) {
      throw new Error('域名解析无结果')
    }
    return answers[answers.length - 1].data
  },

  cf: async function (domain, type) {
    const resp = await http({
      url: `https://1.0.0.1/dns-query`,
      params: {
        name: domain,
        type: type === 'IPv6' ? 'AAAA' : 'A',
      },
      headers: {
        accept: 'application/dns-json',
      },
    })
    const body = JSON.parse(resp.body)
    if (body['Status'] !== 0) {
      throw new Error(`Status is ${body['Status']}`)
    }
    const answers = body['Answer']
    if (answers.length === 0) {
      throw new Error('域名解析无结果')
    }
    return answers[answers.length - 1].data
  },
  ali: async function (domain, type) {
    const resp = await http({
      url: `http://223.6.6.6/resolve`,
      params: {
        name: domain,
        short: 1,
        type: type === 'IPv6' ? 'AAAA' : 'A',
      },
      headers: {
        accept: 'application/dns-json',
      },
    })
    const answers = JSON.parse(resp.body)
    if (answers.length === 0) {
      throw new Error('域名解析无结果')
    }
    return answers[answers.length - 1]
  },
  tencent: async function (domain, type) {
    const resp = await http({
      url: `http://119.28.28.28/d`,
      params: {
        dn: domain,
        type: type === 'IPv6' ? 'AAAA' : 'A',
      },
      headers: {
        accept: 'application/dns-json',
      },
    })
    const answers = resp.body.split(';').map(i => i.split(',')[0])
    if (answers.length === 0 || String(answers) === '0') {
      throw new Error('域名解析无结果')
    }
    return answers[answers.length - 1]
  },
}

async function resolveDomain(domain) {
  let IPv4
  let IPv6
  if (isIPv4(domain)) {
    IPv4 = domain
  } else if (isIPv6(domain)) {
    IPv6 = domain
  } else {
    let resolverName = $.lodash_get(arg, 'DNS') || 'ali'
    let resolver = DOMAIN_RESOLVERS[resolverName]
    if (!resolver) {
      resolverName = 'ali'
      resolver = DOMAIN_RESOLVERS[resolverName]
    }
    const msg = `使用 ${resolverName} 解析域名 ${domain}`
    const res = await Promise.all([
      (async () => {
        try {
          return await resolver(domain, 'IPv4')
        } catch (e) {
          // $.logErr(`${msg} 发生错误: ${e.message || e}`)
        }
      })(),
      (async () => {
        try {
          return await resolver(domain, 'IPv6')
        } catch (e) {
          // $.logErr(`${msg} 发生错误: ${e.message || e}`)
        }
      })(),
    ])
    const [v4, v6] = res

    if (isIPv4(v4)) {
      IPv4 = v4
    } else {
      $.logErr(`${msg} 解析 IPv4 失败`)
    }
    if (isIPv6(v6)) {
      IPv6 = v6
    } else {
      $.logErr(`${msg} 解析 IPv6 失败`)
    }
  }
  return { IP: IPv4 || IPv6, IPv4, IPv6 }
}
// source: https://stackoverflow.com/a/36760050
const IPV4_REGEX = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/

// source: https://ihateregex.io/expr/ipv6/
const IPV6_REGEX =
  /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/

function isIPv4(ip) {
  return IPV4_REGEX.test(ip)
}

function isIPv6(ip) {
  return IPV6_REGEX.test(ip)
}
function isIP(ip) {
  return isIPv4(ip) || isIPv6(ip)
}

async function httpAPI(path = '/v1/requests/recent', method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    $httpAPI(method, path, body, result => {
      resolve(result)
    })
  })
}

function isRequest() {
  return typeof $request !== 'undefined'
}

function isPanel() {
  return $.isSurge() && typeof $input != 'undefined' && $.lodash_get($input, 'purpose') === 'panel'
}

// 请求
async function http(opt = {}) {
  const TIMEOUT = parseFloat(opt.timeout || $.lodash_get(arg, 'TIMEOUT') || 5)
  let timeout = TIMEOUT + 1
  timeout = timeout * 1000

  try {
    if (TIMEOUT) {
      return await Promise.race([
        $.http.get({ ...opt, timeout }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('HTTP TIMEOUT')), TIMEOUT * 1000)),
      ])
    }
    return await $.http.get(opt)
  } catch (e) {
    throw new Error(`请求失败: ${e.message || e}`)
  }
}

// 通知
async function notify(title, subt, desc, opts) {
  if ($.lodash_get(arg, 'TYPE') === 'EVENT' || $.lodash_get(arg, 'notify') == 1) {
    $.msg(title, subt, desc, opts)
  } else {
    $.log('🔕', title, subt, desc, opts)
  }
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}runScript(t,e){return new Promise(s=>{let a=this.getdata("@chavy_boxjs_userCfgs.httpapi");a=a?a.replace(/\n/g,"").trim():a;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[i,o]=a.split("@"),n={url:`http://${o}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":i,Accept:"*/*"},timeout:r};this.post(n,(t,e,a)=>s(a))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const a=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of a)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,a)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[a+1])>>0==+e[a+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,a]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,a,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,a,r]=/^@(.*?)\.(.*?)$/.exec(e),i=this.getval(a),o=a?"null"===i?null:i||"{}":"{}";try{const e=JSON.parse(o);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),a)}catch(e){const i={};this.lodash_set(i,r,t),s=this.setval(JSON.stringify(i),a)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t.stack)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}