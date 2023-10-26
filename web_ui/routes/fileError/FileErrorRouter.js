var express        = require('express');
var mustache       = require('mustache');
var formidable     = require("formidable");
var async          = require('async');
var moment 		   = require('moment');

var port           = require('../../../config/sysconfig').port;
var HtmlLib	       = require('../../../lib/classHtml');
var logging	       = require('../../../lib/classLogging');
var FileErrorLib   = require('../../../lib/classFileError');

var router         = express.Router();
var html           = new HtmlLib();
var log            = new logging();
var fileErr        = new FileErrorLib();

function ShowFileErrorList(Resp, loggedInUser, req, res){
	let frame = {};
	let page = html.GetPage(null);
	frame.ext = html.GetPage('fileerror');
	let Data = html.GetEmptyPage(loggedInUser);

	if(req.session.UserPriv.indexOf('ViewFileUploadErrors') >= 0){
		Data.Granted = true;
	}

	let htmlpage = mustache.render(page, Data, frame);
	res.send(htmlpage);
} /* ShowFileErrorList */

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
} /* addDays */

Date.prototype.subtractDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() - days);
    return date;
} /* subtractDays */

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]"
} /* isString */

function escapeRegExp(str) {
    if (!isString(str)) {
        return "";
    }
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
} /* escapeRegExp */

router.get('/API/fileError', html.requireLogin, function (req, res) {
	let loggedInUser = req.session.username;

	ShowFileErrorList(null, loggedInUser, req, res);
});

router.post('/API/DTGetFileErrorList', html.requireLogin, function (req, res){
	let loggedInUser = req.session.username;

	let DateFrom = req.body.DateFrom;
	let DateTo = req.body.DateTo;
	let FileName = req.body.Filename;
	let Direction = req.body.Direction;
	let ErrorDescription = req.body.ErrorDescription;

	if(!DateFrom) {
		if(DateTo){
			var date = new Date();
			DateFrom = moment(date.subtractDays(1)).format('YYYY-MM-DD');
		}
	}

	if(!DateTo) {
		if(DateFrom){
			var date = new Date();
			DateTo = moment(date).format('YYYY-MM-DD');
		}
	}

	if(DateTo){
		var date = new Date(DateTo);
		DateTo = moment(date.addDays(1)).format('YYYY-MM-DD');
	}


    var searchStr = {};

	if(DateFrom){
	  	searchStr.CreateDate = {
			"$gte": new Date(DateFrom),
			 "$lt": new Date(DateTo)
		  };
	}

	if(FileName){
		searchStr.FileName = new RegExp(escapeRegExp(FileName), "i");
	}

	if(Direction){
		searchStr.Direction = new RegExp(escapeRegExp(Direction), "i");
	}

	if(ErrorDescription){
		searchStr.ErrorDescription = new RegExp(escapeRegExp(ErrorDescription), "i");
	}

	fileErr.DtGetDataQuery(req, {}, loggedInUser, searchStr, function(Resp){
		res.send(Resp);
	});
});

module.exports = router;

