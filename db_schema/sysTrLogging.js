var mongoose = require('mongoose');
var moment   = require('moment');
var Schema = mongoose.Schema

var userTrLogSchema = new Schema({
  TransactionID    : {type: String, default: null},
  Log   		   : {type: String, default: null},
  PluginID		   : {type: String, default: null},
  UserID		   : {type: String, default: null},
  CreateDate       : {type: String, default: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')}
}, { collection: 'UserTransactionLog'})

module.exports = mongoose.model('UserTransactionLog', userTrLogSchema)