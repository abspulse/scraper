import mongoose from 'mongoose'
import Promise from 'bluebird'

import crawler from './crawler'
import indexer from './indexer'
import api from './api'

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

  // Exposing REST API
  api.init(crawler, indexer)

  // CRON Logging
  setInterval(() => {
    api.combineStats(crawler, indexer).then(stats => console.log(stats))
  }, 5000)

})
