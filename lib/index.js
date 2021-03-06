import mongoose from 'mongoose'
import Promise from 'bluebird'

import crawler from './crawler'
import indexer from './indexer'
import api from './api'
import sendMail from './email'

const db = process.env.MONGO || 'localhost'
mongoose.Promise = Promise
mongoose.connect(`mongodb://${db}/mobile`, {
  server: {
    socketOptions : {
      connectTimeoutMS: 90000,
      socketTimeoutMS: 90000,
      wtimeoutMS: 90000
    }
  }
}).then(() => {

  console.log('Connected to mongodb')

  // Setting up the crawler
  crawler.init()

  // Setting up the indexer
  indexer.init()

  // Exposing REST API
  api.init(crawler, indexer)

  // CRON
  let warningSent = new Date(1)
  setInterval(() => {
    api.combineStats(crawler, indexer).then(stats => {

      // Healthcheck
      if (
        (stats.indexer.errorRate > 20 || stats.crawler.errorRate > 20) &&
        new Date() > new Date(warningSent.getTime() + 60 * 60 * 1000)
      ) {
        warningSent = new Date()
        sendMail(JSON.stringify(stats, null, 2))
      }

    })
  }, 5 * 60 * 1000)

}).catch(err => {
  console.log(err)
})

