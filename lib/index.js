import mongoose from 'mongoose'
import Promise from 'bluebird'
import express from 'express'

import crawler from './crawler'
import indexer from './indexer'

const db = process.env.MONGO || 'localhost/mobile'
mongoose.Promise = Promise
mongoose.connect(`mongodb://${db}`, (err) => {
  if (err) {
    return console.log(err)
  }
  console.log('Connected to mongodb')

  // Setting up the crawler
  crawler.init()

  // Setting up the indexer
  indexer.init()

  // Exposing API
  const app = express()
  app.get('/api/status', (req, res) => {
    crawler.getStats().then(crawlerStats => {
      res.json({
        crawler: crawlerStats,
        indexer: indexer.getStats(),
        date: new Date()
      })
    })
  })
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log('Server is listening on port: ' + port)
  })
})
