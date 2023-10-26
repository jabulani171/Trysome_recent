var express        = require('express');
var mustache       = require('mustache');
var formidable     = require("formidable");
var async          = require('async');
var moment 		   = require('moment');


var port           = require('../../../config/sysconfig').port;
var ProductDetailsLib = require('../../../lib/classProductDetails');
var HtmlLib	       = require('../../../lib/classHtml');


var router         = express.Router();
var html           = new HtmlLib();
var prodDetail         = new ProductDetailsLib();



function ShowProductDetails(Resp, loggedInUser, req, res){
	let frame = {};
	let page = html.GetPage(null);
	frame.ext = html.GetPage('productDetails');
	let Data = html.GetEmptyPage(loggedInUser);

	Data.Filter = ' ';

	if(req.query.id){
		Data.Filter = req.query.id;
	}

	if(req.session.UserPriv.indexOf('ViewProducts') >= 0){
		Data.Granted = true;
	}

	let htmlpage = mustache.render(page, Data, frame);
	res.send(htmlpage);
} /* ShowProductDetails */

router.get('/API/productdetails', html.requireLogin, function (req, res){
	let loggedInUser = req.session.username;

	ShowProductDetails(null, loggedInUser, req, res);
});

router.post('/API/DTGetProductDetails', html.requireLogin, function (req, res){
	let loggedInUser = req.session.username;

	prodDetail.DtGetData(req, loggedInUser, function(Resp){
		res.send(Resp);
	});
});

module.exports = router;