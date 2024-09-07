const path = require('path')
const { spawn, spawnSync, execSync } = require('child_process')
const ps = require('node:process')
const ipfsPath = path.resolve(__dirname, 'ipfs')
const ipfsDataPath = path.resolve(__dirname, '.ipfs')
const env = {IPFS_PATH: ipfsDataPath}

// use this custom function instead of spawnSync for better logging
// also spawnSync might have been causing crash on start on windows
const spawnAsync = (...args) =>
  new Promise((resolve, reject) => {
    const spawedProcess = spawn(...args)
    spawedProcess.on('exit', (exitCode, signal) => {
      if (exitCode === 0) resolve()
      else reject(Error(`spawnAsync process '${spawedProcess.pid}' exited with code '${exitCode}' signal '${signal}'`))
    })
    spawedProcess.stderr.on('data', (data) => console.error(data.toString()))
    spawedProcess.stdin.on('data', (data) => console.log(data.toString()))
    spawedProcess.stdout.on('data', (data) => console.log(data.toString()))
    spawedProcess.on('error', (data) => console.error(data.toString()))
  })

const kuboSpawnSync = (...args) => {
  console.log('ipfs', ...args)
  const {stdout, stderr} = spawnSync(ipfsPath, args, {env, hideWindows: true})
  return stdout.toString().trim()
}

const kuboSpawnAsync = (...args) => {
  console.log('ipfs', ...args)
  return spawnAsync(ipfsPath, args, {env, hideWindows: true})
}

const startIpfs = async () => {
  // init ipfs client on first launch
  try {
    await spawnAsync(ipfsPath, ['init'], {env, hideWindows: true})
  } catch (e) {}

  // list of http routers to use
  const httpRouterUrls = [
    'http://127.0.0.1:8888',
    // 'https://cid.contact'
  ]

  // create http routers config file
  const httpRoutersConfig = {
    HttpRoutersParallel: {Type: 'parallel', Parameters: {Routers: []}}
  }
  for (const [i, httpRouterUrl] of httpRouterUrls.entries()) {
    const RouterName = `HttpRouter${i+1}`
    httpRoutersConfig[RouterName] = {Type: 'http', Parameters: {
      Endpoint: httpRouterUrl,
      MaxProvideBatchSize: 1000, // default 100
      MaxProvideConcurrency: 1 // default GOMAXPROCS
    }}
    httpRoutersConfig.HttpRoutersParallel.Parameters.Routers[i] = {
      RouterName: RouterName,
      IgnoreErrors : true,
      Timeout: '10s'
    }
  }
  const httpRoutersMethodsConfig = {
    'find-peers': {RouterName: 'HttpRoutersParallel'},
    'find-providers': {RouterName: 'HttpRoutersParallel'},
    'get-ipns': {RouterName: 'HttpRoutersParallel'},
    provide: {RouterName: 'HttpRoutersParallel'},
    'put-ipns': {RouterName: 'HttpRoutersParallel'}
  }
  await spawnAsync(ipfsPath, ['config', 'Routing.Type', 'custom'], {env, hideWindows: true})
  await spawnAsync(ipfsPath, ['config', '--json', 'Routing.Routers', JSON.stringify(httpRoutersConfig)], {env, hideWindows: true})
  await spawnAsync(ipfsPath, ['config', '--json', 'Routing.Methods', JSON.stringify(httpRoutersMethodsConfig)], {env, hideWindows: true})

  await new Promise((resolve, reject) => {
    const ipfsProcess = spawn(ipfsPath, ['daemon', '--migrate', '--enable-namesys-pubsub'], {env, hideWindows: true})
    console.log(`ipfs daemon process started with pid ${ipfsProcess.pid}`)
    let lastError
    ipfsProcess.stderr.on('data', (data) => {
      lastError = data.toString()
      console.error(data.toString())
    })
    ipfsProcess.stdin.on('data', (data) => console.log(data.toString()))
    ipfsProcess.stdout.on('data', (data) => console.log(data.toString()))
    ipfsProcess.on('error', (data) => console.error(data.toString()))
    ipfsProcess.on('exit', () => {
      console.error(`ipfs process with pid ${ipfsProcess.pid} exited`)
      reject(Error(lastError))
    })
    process.on('exit', () => {
      try {
        ps.kill(ipfsProcess.pid)
      } catch (e) {
        console.log(e)
      }
      try {
        // sometimes ipfs doesnt exit unless we kill pid +1
        ps.kill(ipfsProcess.pid + 1)
      } catch (e) {
        console.log(e)
      }
    })

    ipfsProcess.stdout.on('data', (data) => {
      if (data.toString().match('Daemon is ready')) {
        resolve()
      }
    })
  })
}

module.exports = {
  startIpfs,
  kuboSpawnSync,
  kuboSpawnAsync
}


startIpfs()