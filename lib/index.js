import mongoose from 'mongoose'
import Promise from 'bluebird'
import express from 'express'

import crawler from './crawler'
import indexer from './indexer'

const combineStats = () => crawler.getStats().then(crawlerStats => ({
  crawler: crawlerStats,
  indexer: indexer.getStats(),
  date: new Date()
}))

const db = process.env.MONGO || 'localhost'
mongoose.Promise = Promise
mongoose.connect(`mongodb://${db}/mobile`, (err) => {
  if (err) {
    return console.log(err)
  }
  console.log('Connected to mongodb')

  // Setting up the crawler
  crawler.init()

  // Setting up the indexer
  indexer.init()

  // CRON Logging
  setInterval(() => {
    combineStats().then(stats => console.log(stats))
  }, 5000)

  // Exposing API
  const app = express()
  app.get('/api/status', (req, res) => {
    combineStats().then(stats => {
      res.json(stats)
    })
  })
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log('Server is listening on port: ' + port)
  })
})
