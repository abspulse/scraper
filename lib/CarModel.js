import mongoose, { Schema } from 'mongoose'

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

const CarModel = mongoose.model('Car', CarSchema)

export default CarModel
