import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

import crawler from './crawler'
import indexer from './indexer'

const db = process.env.MONGO || 'localhost/mobile'
mongoose.connect(`mongodb://${db}`, (err) => {
  if (err) {
    return console.log(err)
  }
  console.log('Connected to mongodb')

  // Setting up the crawler
  crawler.init()

  // Setting up the indexer
  indexer.init()

})
