import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

import CarModel from './CarModel'

const updateLastChecked = () => {
  const timeWindow = new Date(new Date().getTime() - 5 * 60000) // ads older then X hours //1 * 60 *
  CarModel.find({ lastChecked : { $lt : timeWindow } }).count().exec().then(count => console.log(count))
  CarModel.find({ lastChecked : { $lt : timeWindow } }).limit(300).exec().then(cars => {
    const i = Math.round(Math.random() * (cars.length - 1))
    const car = cars[i]
    if (!cars.length) {
      return setTimeout(() => updateLastChecked(), 60000)
    }
    car.checkUpdates()
      .then(r => {
        console.log('Crawled ->', r.title, '| Removed:', !!r.removed)
        updateLastChecked()
      })
      .catch(({model, err}) => {
        console.log('Error -> ', model._id, model.mobileId)
        updateLastChecked()
      })
  })
}

mongoose.connect('mongodb://localhost/mobile', (err) => {
  if (err) {
    return console.log(err)
  }
  console.log('Connected to mongodb')
  for (let i = 0; i < 30; i++) {
    updateLastChecked()
  }
})
