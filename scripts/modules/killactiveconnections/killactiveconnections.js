const isPanel = () => typeof $input !== 'undefined' && $input.purpose === 'panel'
const isRequest = () => typeof $request !== 'undefined'

let arg
if (typeof $argument !== 'undefined') {
  arg = Object.fromEntries($argument.split('&').map(item => item.split('=')))
}

if (/^\d+$/.test(arg?.TIMEOUT)) {
  console.log(`Timeout parameter: ${arg?.TIMEOUT} seconds`)
  setTimeout(() => {
    console.log(`Timeout: ${arg?.TIMEOUT - 1}`)
    $done({
      response: {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Timeout: ${arg?.TIMEOUT - 1} seconds` }),
      },
    })
  }, (arg?.TIMEOUT - 1) * 1000)
}

let DISMISS = 0
if (/^\d+$/.test(arg?.DISMISS)) {
  DISMISS = parseInt(arg?.DISMISS, 10)
}

let result = {}
!(async () => {
  if (isPanel()) {
    if ($trigger === 'button') {
      const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
      await kill()
      $notification.post('Panel Triggered', 'Interrupting Requests', `🔴 Active Requests: ${requests.length}`, { 'auto-dismiss': DISMISS })
    }
    const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
    result = { 
      title: `🔴 Active Requests: ${requests.length}`, 
      content: '📱 Tap to Interrupt', 
      ...arg 
    }
  } else if (isRequest()) {
    const params = parseQueryString($request.url)
    if (params?.REQ_RULE) {
      const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
      let count = 0
      for await (const { id, rule, url, URL } of requests) {
        const re = new RegExp(params?.REQ_RULE)
        if (re.test(rule)) {
          console.log(`🔹 ${url || URL}, ${rule} matches rule ${params?.REQ_RULE}`)
          count++
          await httpAPI('/v1/requests/kill', 'POST', { id })
        }
      }
      if (arg?.REQ_NOTIFY == 1) {
        $notification.post('Request Triggered', '', `🔴 Active Requests: ${requests.length}\n🔵 Interrupted: ${count}`, { 'auto-dismiss': DISMISS })
      }
      result = {
        response: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count, rule: params?.REQ_RULE }),
        },
      }
    } else {
      const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
      await kill()
      if (arg?.REQ_NOTIFY == 1) {
        $notification.post('Request Triggered', 'Interrupting Requests', `🔴 Active Requests: ${requests.length}`, { 'auto-dismiss': DISMISS })
      }
      result = {
        response: {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
          body: `
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                  h1 { color: #333; }
                  h2 { color: #666; }
                  button { 
                    background-color: #4CAF50; 
                    border: none; 
                    color: white; 
                    padding: 15px 32px; 
                    text-align: center; 
                    text-decoration: none; 
                    display: inline-block; 
                    font-size: 16px; 
                    margin: 4px 2px; 
                    cursor: pointer; 
                    border-radius: 8px;
                  }
                  button:disabled { background-color: #cccccc; }
                </style>
                <script>
                  window.onload = () => {
                    const btn = document.getElementById("btn");
                    btn.disabled = true;
                    btn.innerHTML = "Refreshing...";
                    setTimeout(function() {
                      btn.disabled = false;
                      btn.innerHTML = "Refresh";
                    }, 1000);
                  }
                </script>
              </head>
              <body>
                <h1>🔴 Found ${requests.length} Active Requests</h1>
                <h2>🔵 Attempted to Interrupt</h2>
                <button id="btn" onclick="location.reload()">Refresh</button>
              </body>
            </html>
          `,
        },
      }
    }
  } else if (arg?.TYPE == 'CRON' && arg?.CRON_RULE) {
    const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
    let count = 0
    for await (const { id, rule, url, URL } of requests) {
      const re = new RegExp(arg?.CRON_RULE)
      if (re.test(rule)) {
        console.log(`🔹 ${url || URL}, ${rule} matches rule ${arg?.CRON_RULE}`)
        count++
        await httpAPI('/v1/requests/kill', 'POST', { id })
      }
    }
    if (arg?.CRON_NOTIFY == 1) {
      $notification.post('Scheduled Task', '', `🔴 Active Requests: ${requests.length}\n🔵 Interrupted: ${count}`, { 'auto-dismiss': DISMISS })
    }
  } else {
    let wifi = $network.wifi && $network.wifi.bssid
    if (wifi) {
      $persistentStore.write(wifi, 'last_network')
    } else {
      wifi = $persistentStore.read('last_network')
      if (wifi) {
        const { requests = [] } = (await httpAPI('/v1/requests/active', 'GET')) || {}
        await kill()
        if (arg?.EVENT_NOTIFY == 1) {
          $notification.post('Network Change', 'Interrupting Requests', `🔴 Active Requests: ${requests.length}`, { 'auto-dismiss': DISMISS })
        }
      }
      $persistentStore.write('', 'last_network')
    }
  }
})()
  .catch(e => {
    console.log(e)
    const msg = `${e.message || e}`
    if (isPanel()) {
      result = { title: '❌ Error', content: msg, ...arg }
    } else if (isRequest()) {
      result = {
        response: {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: msg }),
        },
      }
    } else {
      $notification.post('Network Change', `❌ Error Interrupting Requests`, msg, { 'auto-dismiss': DISMISS })
    }
  })
  .finally(() => $done(result))

async function kill() {
  await httpAPI('/v1/dns/flush', 'POST')
  const beforeMode = (await httpAPI('/v1/outbound', 'GET')).mode
  console.log(`Current outbound mode: ${beforeMode}`)
  const newMode = { direct: 'proxy', proxy: 'direct', rule: 'proxy' }
  console.log(`Switching outbound: ${newMode[beforeMode]}`)
  await httpAPI('/v1/outbound', 'POST', { mode: `${newMode[beforeMode]}` })
  await httpAPI('/v1/outbound', 'POST', { mode: `${newMode[newMode[beforeMode]]}` })
  console.log(`Switching outbound: ${newMode[newMode[beforeMode]]}`)
  console.log(`Reverting to original outbound: ${beforeMode}`)
  await httpAPI('/v1/outbound', 'POST', { mode: `${beforeMode}` })
  if ((await httpAPI('/v1/outbound', 'GET')).mode != beforeMode) {
    console.log(`Switching again: ${beforeMode}`)
    await httpAPI('/v1/outbound', 'POST', { mode: `${beforeMode}` })
  }
}

function httpAPI(path = '', method = 'POST', body = null) {
  return new Promise(resolve => {
    $httpAPI(method, path, body, result => {
      resolve(result)
    })
  })
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseQueryString(url) {
  const queryString = url.split('?')[1]
  const regex = /([^=&]+)=([^&]*)/g
  const params = {}
  let match
  while ((match = regex.exec(queryString))) {
    const key = decodeURIComponent(match[1])
    const value = decodeURIComponent(match[2])
    params[key] = value
  }
  return params
}
