import mongoose, { Schema } from 'mongoose'
import r from 'request-promise'

const CarSchema = new Schema({
  mobileId: Number,
  sellerId: Number,
  version: Number,
  title: String,
  makeId: Number,
  modelId: Number,
  makeKey: String,
  modelKey: String,
  images: Array,
  price: Object,
  priceHistory: Array,
  contact: Object,
  new: Boolean,
  isConditionNew: Boolean,
  category: String,
  attributes: Array,
  features: Array,
  hasDamage: Boolean,
  segment: String,
  url: String,
  created: Date,
  modified: Date,
  renewed: Date,
  removed: Date,
  lastChecked: {
    type: Date,
    default: Date.now
  }
})

CarSchema.methods.checkUpdates = function() {
  const resourceURI = `http://m.mobile.de/svc/a/${this.mobileId}`
  return r.get({
    uri: resourceURI,
    proxy: process.env.TOR_URL || 'http://localhost:8118',
    json: true
  })
  .then(res => {
    res.isNew = false
    res.created = res.created * 1000
    res.modified = res.modified * 1000
    res.renewed = res.renewed * 1000
    res.priceHistory = res.priceHistory || []
    res.priceHistory.push(res.price)
    res.lastChecked = new Date()
    for(let k in res) this[k]=res[k]
    return this.save()
  })
  .catch(err => {
    if (err.response && err.response.statusCode === 404) {
      this.removed = new Date()
      this.lastChecked = new Date()
      return this.save()
    } else if (err.response && err.response.statusCode !== 404) {
      this.lastChecked = new Date()
      return this.save()
    } else {
      return Promise.reject({model: this, err})
    }
  })
}

const CarModel = mongoose.model('Car', CarSchema)

export default CarModel
