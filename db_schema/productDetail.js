var mongoose = require('mongoose');
var moment   = require('moment');

var Schema = mongoose.Schema

var ProductDetailsSchema = new Schema({
   Part_Number: {type: String, default: null},
   OE_No: {type: String, default: null},
   Description: {type: String, default: null},
   Bin_Location: {type: String, default: null},
   Brand: {type: String, default: null},
   Footer: {type: String, default: null}
}, { collection: 'ProductDetails'})

module.exports = mongoose.model('ProductDetails', ProductDetailsSchema);