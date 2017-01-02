import r from 'request-promise'
import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

import CarModel from './CarModel'

let lastId = 0

const findNewItems = () => {
  r.get({
    proxy: 'http://localhost:8118',
    uri: 'http://m.mobile.de/svc/s/?od=down&ps=0&s=Car&sb=doc&vc=Car&psz=300',
    json: true
  })
  .then(res => res.items.filter(item =>
    item.id > lastId && item.modified - item.created < 500
  ))
  .then(items => items.map(item => {
    console.log(item.title)
    item.new = item.isNew
    item.mobileId = item.id
    item.created = item.created * 1000
    item.modified = item.modified * 1000
    item.renewed = item.renewed * 1000
    return item
  }))
  .then(items => {
    lastId = items[0].id
    CarModel.create(items)
    .then((res) => {
      console.log('Saved -> ', res.length)
      setTimeout(() => findNewItems(), 5000)
    })
  })
  .catch(err => {
    console.log(err)
    findNewItems()
  })
}

mongoose.connect('mongodb://localhost/mobile', (err) => {
  if (err) {
    return console.log(err)
  }
  console.log('Connected to mongodb')
  CarModel.findOne({}).sort({_id : -1 }).exec().then(car => {
    lastId = car ? car.mobileId : 0
    console.log('Saving cars from id: ', lastId)
    findNewItems()
  })
})
