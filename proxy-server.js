const http = require('http')
const httpProxy = require('http-proxy')
require('util').inspect.defaultOptions.depth = null

const debug = process.argv.includes('--debug')

const proxyPort = 8888
const indexProviderUrl = 'http://127.0.0.1:9999'
const storetheindexUrl = 'http://127.0.0.1:3000'
const indexstarUrl = 'http://127.0.0.1:7777'

// start proxy
const proxy = httpProxy.createProxyServer({})

// rewrite the request
// proxy.on('proxyReq', function(proxyReq, req, res, options) {
//   // remove headers that could potentially cause an ipfs 403 error
//   proxyReq.removeHeader('CF-IPCountry')
//   proxyReq.removeHeader('X-Forwarded-For')
//   proxyReq.removeHeader('CF-RAY')
//   proxyReq.removeHeader('X-Forwarded-Proto')
//   proxyReq.removeHeader('CF-Visitor')
//   proxyReq.removeHeader('sec-ch-ua')
//   proxyReq.removeHeader('sec-ch-ua-mobile')
//   proxyReq.removeHeader('user-agent')
//   proxyReq.removeHeader('origin')
//   proxyReq.removeHeader('sec-fetch-site')
//   proxyReq.removeHeader('sec-fetch-mode')
//   proxyReq.removeHeader('sec-fetch-dest')
//   proxyReq.removeHeader('referer')
//   proxyReq.removeHeader('CF-Connecting-IP')
//   proxyReq.removeHeader('CDN-Loop')
// })

const logReq = async (req) => {
  // if not debugging, only log fast
  if (!debug) {
    console.log({method: req.method, url: req.url, headers: req.headers})
    return
  }
  let reqBody = ''
  req.on('data', chunk => {reqBody += chunk})
  await new Promise(r => req.on('end', r))
  try {
    reqBody = JSON.parse(reqBody)
  }
  catch (e) {}
  console.log({method: req.method, url: req.url, headers: req.headers, body: reqBody})
}

const logRes = async (res, req) => {
  if (!debug) {
    return
  }
  let resBody = ''
  res.on('data', chunk => {resBody += chunk})
  await new Promise(r => res.on('end', r))
  try {
    resBody = JSON.parse(resBody)
  }
  catch (e) {}
  console.log({status: `${res.statusCode} ${res.statusMessage}`, method: req.method, url: req.url, headers: res.headers, body: resBody})
}

proxy.on('proxyRes', (proxyRes, req, res) => {
  logRes(proxyRes, req)
})

proxy.on('error', (e, req, res) => {
  console.error(e)
  // if not ended, will hang forever
  res.end()
})

// start server
const startServer = (port) => {
  const server = http.createServer()

  // never timeout the keep alive connection
  // server.keepAliveTimeout = 0
  server.keepAliveTimeout = 60000

  server.on('request', async (req, res) => {
    logReq(req)

    // only delegated routing PUT is supported by index provider for now, GET might be supported later
    if (req.method === 'PUT') {
      proxy.web(req, res, {target: indexProviderUrl})
    }
    // storetheindex IPNI instance supports delegated routing GET, but with incorrect API
    else {
      proxy.web(req, res, {target: indexstarUrl})
    }
  })
  server.on('error', console.error)
  server.listen(port)
  console.log(`proxy server listening on port ${port}`)
}

startServer(proxyPort)
startServer(80)
