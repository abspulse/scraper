import express from 'express'
import bodyParser from 'body-parser'

export const combineStats = (crawler, indexer) => crawler.getStats().then(crawlerStats => ({
  crawler: crawlerStats,
  indexer: indexer.getStats(),
  date: new Date()
}))

const filterResults = (req, res, next) => {

  if (req.query.type) {
    res.body = res.body.filter(result => result.type === req.query.type)
  }

  if (req.query.since) {
    res.body = res.body.filter(result => result.date > new Date(req.query.since))
  }

  const skip = req.query.skip || 0
  const limit = req.query.limit || 10
  res.body = res.body.splice(skip, limit)

  next()
}

export const init = (crawler, indexer) => {
  const app = express()
  app.use(bodyParser.json())

  app.get('/api/status', (req, res) => {
    combineStats(crawler, indexer).then(stats => {
      res.json(stats)
    })
  })

  app.put('/api/crawler', (req, res) => {
    if (req.body.reCheckInterval) {
      crawler.setReCheckInterval(parseInt(req.body.reCheckInterval, 10))
    }
    res.json({status: 'success'})
  })

  app.get('/api/crawler/events', (req, res, next) => {
    res.body = [...crawler.events].reverse()
    next()
  }, filterResults, (req, res) => res.json(res.body))

  app.get('/api/indexer/events', (req, res, next) => {
    res.body = [...indexer.events].reverse()
    next()
  }, filterResults, (req, res) => res.json(res.body))

  const port = process.env.PORT || 3001
  app.listen(port, () => {
    console.log('Server is listening on port: ' + port)
  })
}

export default { init, combineStats}
