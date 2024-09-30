let movieId = '1300930';
let options = {
    url: `https://frodo.douban.com/api/v2/movie/${movieId}?apiKey=0ac44ae016490db2204ce0a042db2916`,
    headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.3(0x18000323) NetType/WIFI Language/en",
        "Referer": "https://servicewechat.com/wx2f9b06c1de1ccfca/82/page-frame.html"
    }
};

console.log(`开始请求...`);
console.log(`请求URL: ${options.url}`);
console.log(`请求Headers: ${JSON.stringify(options.headers, null, 2)}`);

$httpClient.get(options, function(error, response, data) {
    if (error) {
        console.log(`请求错误: ${JSON.stringify(error)}`);
        $done();
        return;
    }
    
    console.log(`状态码: ${response ? response.status : 'undefined'}`);
    console.log(`响应Headers: ${response ? JSON.stringify(response.headers, null, 2) : 'undefined'}`);
    console.log(`原始响应数据: ${data}`);
    
    if (data) {
        try {
            let jsonData = JSON.parse(data);
            console.log(`解析后的JSON数据: ${JSON.stringify(jsonData, null, 2)}`);
        } catch (e) {
            console.log(`JSON解析错误: ${e.message}`);
        }
    } else {
        console.log('响应数据为空');
    }
    
    $done();
});
