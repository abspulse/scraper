import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

import fetch from './proxyFetch'
import CarModel from './CarModel'

// Globals
let lastId = 0
let events = []

// Event adder for keeping our in-memory log no more then 10,000 records
const addEvent = (event) => {
  const maxItemCount = 1000
  events.push(event)
  if (events.length > maxItemCount) {
    events.splice(0, events.length - maxItemCount)
  }
}

const findNewItems = () => {
  fetch('http://m.mobile.de/svc/s/?od=down&ps=0&s=Car&sb=doc&vc=Car&psz=300')
  .then(res => res.items.filter(item =>
    item.id > lastId && item.modified - item.created < 500
  ))
  .then(items => items.map(item => {
    item.new = item.isNew
    item.mobileId = item.id
    item.created = item.created * 1000
    item.modified = item.modified * 1000
    item.renewed = item.renewed * 1000
    item.priceHistory = [{ ...item.price, date: new Date()}]
    return item
  }))
  .then(items => {
    if (items.length) {
      lastId = items[0].id
      CarModel.create(items)
      .then((res) => {
        addEvent({
          type: 'success',
          date: new Date(),
          items
        })
      })
    }

    setTimeout(() => findNewItems(), 5000)
  })
  .catch(err => {
    // Logging error
    addEvent({
      type: 'error',
      error: err.message,
      date: new Date()
    })
    console.log(err);
    findNewItems()
  })
}

export const getStats = () => {
  // Time helpers
  const minutesAgo = (min) => new Date(new Date().getTime() - min * 60 * 1000)

  // Error occured in the last 5 minutes
  const recentEvents = events.filter(event => event.date > minutesAgo(5))
  const errorRate = Math.round(recentEvents.filter(event => event.type === 'error').length / recentEvents.length * 100) || 0

  // Cars saved in the last 5 min
  const savedInLastFiveMin = events.reduce((mem, event) => {
    if (event.date > minutesAgo(5) && event.type === 'success') {
      mem += event.items.length
    }
    return mem
  }, 0)


  return {
    errorRate,
    savedInLastFiveMin
  }
}

const init = () => {
  return CarModel.findOne({}).sort({_id : -1 }).exec().then(car => {
    console.log('Indexer initiated.')
    lastId = car ? car.mobileId : 0
    console.log('Saving cars from id: ', lastId)
    findNewItems()
    return lastId
  })
}

export default { init, getStats, events }
