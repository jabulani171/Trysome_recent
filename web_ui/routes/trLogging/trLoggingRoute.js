var express        = require('express');
var mustache       = require('mustache');
var moment 		   = require('moment')
var formidable     = require("formidable");
var async          = require('async');
var router         = express.Router();

var HtmlLib	       = require('../../../lib/classHtml');
var trLogLib	   = require('../../../lib/classLogging');
var aeLib          = require('../../../lib/classAE');

var html           = new HtmlLib();
var trLog 		   = new trLogLib();
var ae             = new aeLib();

function ShowTrList(Resp, loggedInUser, req, res){
	let frame = {};
	let page = html.GetPage(null);
	frame.ext = html.GetPage('trloglist');
	let Data = html.GetEmptyPage(loggedInUser);

	let htmlpage = mustache.render(page, Data, frame);
	res.send(htmlpage);
} /* ShowTrList */

function ShowUserTrLogs(Resp, loggedInUser, req, res){
	let frame = {};
	let page = html.GetPage(null);
	frame.ext = html.GetPage('usertrloglist');
	let Data = html.GetEmptyPage(loggedInUser);

	let htmlpage = mustache.render(page, Data, frame);
	res.send(htmlpage);
} /* ShowUserTrLogs */

function ShowPayload(Resp, loggedInUser, req, res){
	let frame = {}
	let page = html.GetPage(null);
	frame.ext = html.GetPage('trlogview');
	let Data = html.GetEmptyPage(loggedInUser);

	if(Resp){
		if(Resp.Err){
			Data.alertMsg = 'Internal Server Error';
		}

		if(Resp.Msg){
			Data.alertMsg = Resp.Msg;
		}

		if(req.session.msg){
			Data.alertMsg = req.session.msg;
			delete req.session.msg;
		}

		if(Resp.Tr){
			Data.TrPayload = Resp.Tr;
		}
	} else {
		Data.alertMsg = 'Internal Server Error';
	}

	let htmlpage = mustache.render(page, Data, frame);
	res.send(htmlpage);
} /* ShowPayload */

function updateEachViewed(DetailArr, index, userId){
	if(index >= DetailArr.length){
		return;
	}

	DetailArr[index].UsersViewed.push(userId);
	ae.Update(DetailArr[index], function(Resp){
		index++;
		updateEachViewed(DetailArr, index, userId);
	});
} /* updateEachViewed */

function ShowAEList(Resp, loggedInUser, req, res){
	let frame = {}
	let page = html.GetPage(null);
	frame.ext = html.GetPage('aeloglist');
	let Data = html.GetEmptyPage(loggedInUser);

	if(Resp){
		if(Resp.Err){
			Data.alertMsg = 'Internal Server Error';
		}
		
		if(Resp.DetailArr){
			if(Resp.DetailArr.length > 0){
				updateEachViewed(Resp.DetailArr, 0, loggedInUser);
			}
		}

		Data.AEList = Resp.DetailArr;
	}

	let htmlpage = mustache.render(page, Data, frame);
	res.send(htmlpage);
} /* ShowAEList */

router.get('/API/trLogging', html.requireLogin, function (req, res) {
	let loggedInUser = req.session.username;

	ShowTrList(null, loggedInUser, req, res);
});

router.post('/API/DTGetIntegrationTransactions', html.requireLogin, function (req, res){
	let loggedInUser = req.session.username;

	trLog.DtGetIntegrationTrData(req, loggedInUser, function(Resp){
		res.send(Resp);
	});
});

router.get('/API/usertrLogging', html.requireLogin, function (req, res) {
	let loggedInUser = req.session.username;

	ShowUserTrLogs(null, loggedInUser, req, res);
});

router.post('/API/DTGetUserTransactions', html.requireLogin, function (req, res){
	let loggedInUser = req.session.username;

	trLog.DtGetUserTrData(req, loggedInUser, function(Resp){
		res.send(Resp);
	});
});

router.get('/API/aeLogging', html.requireLogin, function (req, res) {
	let loggedInUser = req.session.username;

	let ulist = [];
	ulist.push(loggedInUser);
	ae.Find({'UsersViewed':{$nin: ulist}}, function(Resp){
		ShowAEList(Resp, loggedInUser, req, res);
	});
});

module.exports = router;
