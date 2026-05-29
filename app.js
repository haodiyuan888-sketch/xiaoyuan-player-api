const http = require('http')
const url = require('url')

let apiModule
try {
  apiModule = require('@neteasecloudmusicapienhanced/api')
} catch (e) {
  console.error('无法加载 @neteasecloudmusicapienhanced/api:', e.message)
  console.error('请运行: npm install')
  process.exit(1)
}

const PORT = process.env.PORT || 3000

// URL 路径 → API 函数名映射（/xxx/yyy → xxx_yyy）
function pathToFunction(pathname) {
  return pathname.replace(/^\//, '').replace(/\//g, '_')
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        resolve({})
      }
    })
  })
}

const server = http.createServer(async (req, res) => {
  // CORS（支持 credentials）
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie')
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const parsedUrl = url.parse(req.url, true)
  const fnName = pathToFunction(parsedUrl.pathname)
  const query = parsedUrl.query
  const body = req.method === 'POST' ? await parseBody(req) : {}

  // 合并参数
  const data = { ...query, ...body }

  // 传递 cookie
  if (req.headers.cookie) {
    data.cookie = req.headers.cookie
  }

  console.log(`[API] ${req.method} /${fnName}`, JSON.stringify(data).slice(0, 200))

  if (typeof apiModule[fnName] === 'function') {
    try {
      const result = await apiModule[fnName](data)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result.body))
    } catch (err) {
      console.error(`[API] 错误: ${fnName}`, err.message)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ code: 500, msg: err.message }))
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ code: 404, msg: `接口 /${fnName} 不存在` }))
  }
})

server.listen(PORT, () => {
  console.log(`小源播放器 API 服务已启动: http://localhost:${PORT}`)
})
