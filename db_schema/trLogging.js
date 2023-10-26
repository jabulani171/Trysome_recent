var mongoose = require('mongoose');
var moment   = require('moment');
var Schema = mongoose.Schema

var trLogSchema = new Schema({
  TransactionID    : {type: String, default: null},
  Request          : {type: String, default: null},
  Response         : {type: String, default: null},
  Direction		   : {type: String, default: null},
  Status		   : {type: String, default: null},
  PluginID		   : {type: String, default: null},
  CreateDate       : {type: String, default: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}
}, { collection: 'TransactionLog'})

module.exports = mongoose.model('TransactionLog', trLogSchema)