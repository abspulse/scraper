import Promise from 'bluebird'

import fetch from './proxyFetch'
import CarModel from './CarModel'

// Globals
let queue = []
let events = []
let toBeSaved = []
let crawlInterval = 1440 // In minutes
let saveInterval = 5000 // in ms

// Event adder for keeping our in-memory log no more then 10,000 records
const addEvent = (event) => {
  const maxItemCount = 10000
  events.push(event)
  if (events.length > maxItemCount) {
    events.splice(0, events.length - maxItemCount)
  }
}

// Change crawlInterval
const setCrawlInterval = (minutes) => {
  crawlInterval = minutes
}

// Change saveInterval
const setSaveInterval = (ms) => {
  saveInterval = ms
}

// Time helpers
const secondsAgo = (sec) => new Date(new Date().getTime() - sec * 1000)
const minutesAgo = (min) => new Date(new Date().getTime() - min * 60 * 1000)
const hoursAgo = (h) => new Date(new Date().getTime() - h * 60 * 60 * 1000)

// Fetch data from mobile.de
const fetchCarData = (car) =>
  fetch(`http://m.mobile.de/svc/a/${car.mobileId}`)
  .then(res => {
    // Mongoose reserved property
    delete res.isNew

    // Converting time to js (milisecond based)
    res.created = res.created * 1000
    res.modified = res.modified * 1000
    res.renewed = res.renewed * 1000

    // If price has changed since last check, store it in priceHistory
    if (res.price.grs.amount !== car.price.grs.amount) {
      car.priceHistory.push({ ...res.price, date: new Date()})
    }

    // Update lastChecked
    res.lastChecked = new Date()

    // Copy all attributes to Model from response
    for(let k in res) car[k]=res[k]

    // Save and return Promise
    return car
  })
  .catch(err => {
    // If car has been removed set removed property
    if (err.response && err.response.statusCode === 404) {
      car.removed = new Date()
      car.lastChecked = new Date()
      return car

    // If item is locked or not avaiable right now, leave it as it is
    } else if (err.response && err.response.statusCode !== 404) {
      car.lastChecked = new Date()
      return car

    // Something went wrong with the request
    } else {
      return Promise.reject({model: car, err})
    }
  })

// Mongo query to get cars that are due to be re-checked
const getQuery = () => ({
  lastChecked: { $lt : minutesAgo(crawlInterval) },
  _id: { $nin: queue.map(item => item._id) },
  removed: null
})

const getNewItemsToQueue = () => {
  // Schedule next recursive call
  setTimeout(() => getNewItemsToQueue(), 10 * 1000)

  // If more the 100 items in queue, let's just wait
  if (queue.length > 100) {
    return
  }

  // Get cars that are needed to be fetched
  CarModel.find(getQuery()).limit(500).exec().then(cars => {
    if (cars.length) {
      queue = [
        ...queue,
        ...cars
      ]
    }
  })
}

const crawlNextCar = () => {
  // Check if there are cars to be fetched
  if (!queue.length) {
    return setTimeout(() => crawlNextCar(), 1000)
  }

  // Remove first item from queue
  const car = queue.shift()

  // Fetch data for current car
  return fetchCarData(car)
    .then(res => {
      // Logging success
      addEvent({
        type: 'success',
        item: car.toJSON(),
        date: new Date()
      })

      return res
    })
    .then(car => {
      toBeSaved.push(car)
      // Get next car
      crawlNextCar()
    })
    .catch(({model, err}) => {
      // Logging error
      addEvent({
        type: 'error',
        error: err,
        date: new Date()
      })

      // Push it bact to the end if error has occured so we can try again later
      queue.push(car)

      // Get next car
      crawlNextCar()
    })
}

export const getStats = () => {
  // Successful requests in memory
  const successReqs = events.filter(event => event.type === 'success')

  // Summing the number of successful requests in the past second
  const lastSec = secondsAgo(1)
  const reqPerSec = successReqs.filter(event =>
    event.date > lastSec
  ).length

  // Calculating avg req speed based on the last minute performance
  const latestSuccessRequest = successReqs.filter(req => req.date > minutesAgo(1))
  const avgReqPerSec = latestSuccessRequest.length
    ? Math.round(latestSuccessRequest.length / ((new Date().getTime() - latestSuccessRequest[0].date.getTime()) / 1000))
    : 0

  // Error occured in the last 5 minutes
  const recentEvents = events.filter(event => event.date > minutesAgo(5))
  const errorRate = Math.round(recentEvents.filter(event => event.type === 'error').length / recentEvents.length * 100) || 0

  // Number of records due in database
  return CarModel.find(getQuery()).count().exec().then(count => (
      {
        itemsLeftToCrawl: count + queue.length,
        queueLength: queue.length,
        reqPerSec,
        avgReqPerSec,
        crawlInterval,
        errorRate,
        toBeSaved: toBeSaved.length
      }
    )
  )
  // Numnber of total unsold cars in database
  .then(stats => CarModel.find({removed: null}).count().exec().then(unSoldCount =>
      ({
        ...stats,
        unSoldCount
      })
    )
  )

}

const saveUpdatedCarsToDB = () => {
  CarModel.collection.bulkWrite(toBeSaved.splice(0, 1000).map(car => ({
      updateOne : {
        filter : { _id: car._id },
        update : car.toJSON()
      }
    }))
  )

  setTimeout(() => {
    saveUpdatedCarsToDB()
  }, saveInterval)
}

// Init
export const init = () => {
  console.log('Crawler initiated.')
  // Start queue maintaner
  getNewItemsToQueue()

  // Start crawler threads
  for (let i = 0; i < 30; i++) {
    crawlNextCar()
  }

  saveUpdatedCarsToDB()
}

export default { init, getStats, events, setCrawlInterval, setSaveInterval }
