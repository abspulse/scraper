import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

import CarModel from './CarModel'

let queue = []
let events = []

const addEvent = (event) => {
  const maxItemCount = 50000
  events.push(event)
  if (events.length > maxItemCount) {
    events.splice(0, events.length - maxItemCount)
  }
}

const secondsAgo = (sec) => new Date(new Date().getTime() - sec * 1000)
const minutesAgo = (min) => new Date(new Date().getTime() - min * 60 * 1000)
const hoursAgo = (h) => new Date(new Date().getTime() - h * 60 * 60 * 1000)

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
  car.checkUpdates()
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
        error: err,
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

  const avgReqPerSec = successReqs[0]
    ? Math.round(successReqs.length / ((new Date().getTime() - successReqs[0].date.getTime()) / 1000))
    : 0

  const errorRate = events.filter(event => event.type === 'error').length / events.length * 100 || 0

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
  )

}

setInterval(() => {
  const stats = getStats().then(stats => {
    console.log(stats);
  })
}, 1000)

mongoose.connect('mongodb://localhost/mobile', (err) => {
  if (err) {
    return console.log(err)
  }
  console.log('Connected to mongodb')
  getNewItemsToQueue()

  for (let i = 0; i < 30; i++) {
    crawlNextCar()
  }
})
