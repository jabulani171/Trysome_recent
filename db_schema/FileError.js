var mongoose = require('mongoose');
var moment   = require('moment');

var Schema = mongoose.Schema

var FileErrorSchema = new Schema({
	CreateDate         : {type: String, default: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')},
	FileName           : {type: String, default: null},
	ScriptNo           : {type: String, default: null},
	Direction          : {type: String, default: null},
	ErrorDescription   : {type: String, default: null}
}, { collection: 'FileError'})

module.exports = mongoose.model('FileError', FileErrorSchema);
