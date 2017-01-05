import request from 'request-promise'
import fs from 'fs'

const agentStrings = JSON.parse(fs.readFileSync(__dirname + '/userAgents.json','utf8'))

const r = (uri) => {
  const userAgent = agentStrings[Math.round(Math.random() * (agentStrings.length - 1))]
  return request.get({
    uri,
    proxy: process.env.PROXY_URL || 'http://localhost:8118',
    json: true,
    headers: {
      'User-Agent': userAgent
    }
  })
}

export default r
