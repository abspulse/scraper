import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

import fetch from './request-proxy'
import CarModel from './CarModel'

let queue = []
let events = []

const addEvent = (event) => {
  const maxItemCount = 10000
  events.push(event)
  if (events.length > maxItemCount) {
    events.splice(0, events.length - maxItemCount)
  }
}

const secondsAgo = (sec) => new Date(new Date().getTime() - sec * 1000)
const minutesAgo = (min) => new Date(new Date().getTime() - min * 60 * 1000)
const hoursAgo = (h) => new Date(new Date().getTime() - h * 60 * 60 * 1000)

const fetchCarData = (car) =>
  fetch(`http://m.mobile.de/svc/a/${car.mobileId}`)
  .then(res => {
    res.isNew = false
    res.created = res.created * 1000
    res.modified = res.modified * 1000
    res.renewed = res.renewed * 1000
    if (res.price.grs.amount !== car.price.grs.amount) {
      car.priceHistory.push({ ...res.price, date: new Date()})
    }
    res.lastChecked = new Date()
    for(let k in res) car[k]=res[k]
    return car.save()
  })
  .catch(err => {
    if (err.response && err.response.statusCode === 404) {
      car.removed = new Date()
      car.lastChecked = new Date()
      return car.save()
    } else if (err.response && err.response.statusCode !== 404) {
      car.lastChecked = new Date()
      return car.save()
    } else {
      return Promise.reject({model: car, err})
    }
  })

const getQuery = () => ({
  lastChecked: { $lt : minutesAgo(15) },
  _id: { $nin: queue.map(item => item._id) },
  removed: null
})

const getNewItemsToQueue = () => {
  setTimeout(() => getNewItemsToQueue(), 1000)

  if (queue.length > 100) {
    return
  }

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
  if (!queue.length) {
    return setTimeout(() => crawlNextCar(), 1000)
  }

  const car = queue.shift()
  return fetchCarData(car)
    .then(r => {
      addEvent({
        type: 'success',
        date: new Date()
      })
      crawlNextCar()
    })
    .catch(({model, err}) => {
      addEvent({
        type: 'error',
        error: err.message,
        date: new Date()
      })
      queue.push(car)
      crawlNextCar()
    })
}

const getStats = () => {
  const successReqs = events.filter(event => event.type === 'success')

  const lastSec = secondsAgo(1)
  const reqPerLastSec = successReqs.filter(event =>
    event.date > lastSec
  ).length

  const latestSuccessRequest = successReqs.filter(req => req.date >= minutesAgo(1))
  const avgReqPerSec = latestSuccessRequest.length
    ? Math.round(latestSuccessRequest.length / ((new Date().getTime() - latestSuccessRequest[0].date.getTime()) / 1000))
    : 0

  const errorRate = Math.round(events.filter(event => event.type === 'error').length / events.length * 100) || 0

  return CarModel.find(getQuery()).count().exec().then(count => (
      {
        itemsLeftToCrawl: count + queue.length,
        queueLength: queue.length,
        reqPerLastSec,
        avgReqPerSec,
        errorRate,
        date: new Date()
      }
    )
  ).then(stats => CarModel.find({removed: null}).count().exec().then(unSoldCount =>
      ({
        ...stats,
        unSoldCount
      })
    )
  )

}

setInterval(() => {
  const stats = getStats().then(stats => {
    console.log(stats);
  })
}, 1000)

const db = process.env.MONGO || 'localhost/mobile'
mongoose.connect(`mongodb://${db}`, (err) => {
  if (err) {
    return console.log(err)
  }
  console.log('Connected to mongodb')
  getNewItemsToQueue()

  for (let i = 0; i < 30; i++) {
    crawlNextCar()
  }
})
