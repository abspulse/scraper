import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

import CarModel from './CarModel'

let queue = []

const getNewItemsToQueue = () => {
  console.log('Currently ' + queue.length + ' items in queue')
  const idsInQueue = queue.map(item => item._id.toString())
  const timeWindow = new Date(new Date().getTime() - 5 * 60000) // ads older then X hours //1 * 60 *
  CarModel.find({ lastChecked : { $lt : timeWindow }, _id : { $nin: idsInQueue } }).limit(300).exec().then(cars => {
    if (cars.length) {
      queue = [
        ...queue,
        ...cars
      ]
      console.log('Added ' + cars.length + ' new items to the queue');
    }
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
      console.log('Crawled ->', r.title, '| Removed:', !!r.removed)
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
  for (let i = 0; i < 35; i++) {
    crawlNextCar()
  }
})
