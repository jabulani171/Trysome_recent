var mongoose = require('mongoose');
var moment   = require('moment');
var Schema = mongoose.Schema

var printerStationSchema = new Schema({
  Printing_Station_IP		  : {type: String, default: null},
  Printing_Station_ID  		  : {type: String, default: null},
  Printer_Name               : {type: String, default: null},
}, { collection: 'PrintingStation'})

module.exports = mongoose.model('PrintingStation', printerStationSchema)