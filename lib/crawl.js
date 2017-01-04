import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

import CarModel from './CarModel'

let queue = []
let queuePrevLength = 0
let processingSpeedLog = []

const getNewItemsToQueue = () => {
  console.log(' ')
  console.log('Currently ' + queue.length + ' items in queue')
  const idsInQueue = queue.map(item => item._id)
  const timeWindow = new Date(new Date().getTime() - 5 * 60000) // ads older then X hours //1 * 60 *
  CarModel.find({ lastChecked : { $lt : timeWindow }, _id : { $nin: idsInQueue } }).limit(300).exec().then(cars => {
    if (cars.length) {
      queue = [
        ...queue,
        ...cars
      ]
      console.log('Added ' + cars.length + ' new items to the queue');
    }
    const reqsPerSec = (queuePrevLength - queue.length) / 5
    if (reqsPerSec >= 0) {
      processingSpeedLog.unshift(reqsPerSec)
      const sum = processingSpeedLog.reduce(function(a, b) { return a + b; })
      const avg = Math.round(sum / processingSpeedLog.length)
      console.log('Processing ' + processingSpeedLog[0] + ' req/s')
      console.log('Avg ' + avg + ' req/s')
    }
    queuePrevLength = queue.length + cars.length
    setTimeout(() => getNewItemsToQueue(), 5000)
  })
}

const crawlNextCar = () => {
  if (!queue.length) {
    return setTimeout(() => crawlNextCar(), 5000)
  }

  const car = queue.shift()
  car.checkUpdates()
    .then(r => {
      // console.log('Crawled ->', r.title, '| Removed:', !!r.removed)
      // process.stdout.write('.')
      crawlNextCar()
    })
    .catch(({model, err}) => {
      const statusCode = err.response ? err.response.statusCode : ''
      console.log('Error -> ', model._id, model.mobileId, err.code)
      queue.push(car)
      crawlNextCar()
    })
}

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
