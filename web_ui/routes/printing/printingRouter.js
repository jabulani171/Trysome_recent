var express        = require('express');
var mustache       = require('mustache');
var formidable     = require("formidable");
var async          = require('async');
var moment 		   = require('moment');
var rest           = require('restler');
var exec           = require('child_process').spawn;

var port           = require('../../../config/sysconfig').port;
var HtmlLib	       = require('../../../lib/classHtml');
var paramLib	   = require("../../../lib/classParam");
var LogLib	       = require('../../../lib/classLogging');
var StnLib         = require('../../../lib/classPrintingStation');

const { Console } = require('console');

var router         = express.Router();
var html           = new HtmlLib();
var param 		   = new paramLib();
var log 		   = new LogLib();
var stn            = new StnLib();

function ShowPrintingStationList(Resp, loggedInUser, req, res){
	let frame = {};
	let page = html.GetPage(null);
	frame.ext = html.GetPage('printingStationList');
	let Data = html.GetEmptyPage(loggedInUser);

	if(req.session.UserPriv.indexOf('ViewPrintingStationList') >= 0){
		Data.Granted = true;
	}

	if(req.session.UserPriv.indexOf('ManagePrintingStation') >= 0){
		Data.ManagePrintingStation = true;
	}

	let htmlpage = mustache.render(page, Data, frame);
	res.send(htmlpage);
} /* ShowPrintingStationList */

router.get('/API/printingstationlist', html.requireLogin, function (req, res) {
	let loggedInUser = req.session.username;

	ShowPrintingStationList(null, loggedInUser, req, res);
});

router.post('/API/DTGetPrintingStationList', html.requireLogin, function (req, res){
	let loggedInUser = req.session.username;

	stn.DtGetData(req, loggedInUser, function(Resp){
		res.send(Resp);
	});
});

router.post('/API/DTGetPrintingStationList', html.requireLogin, function (req, res){
	let loggedInUser = req.session.username;

	stn.DtGetData(req, loggedInUser, function(Resp){
		res.send(Resp);
	});
});

//Create A Printing Station
router.post('/API/addPrintingStation', function (req, res){
	if(!req.session || !req.session.username){
		return res.send({Msg: "Session Expired"});
	}

	let loggedInUser = req.session.username;

	let Printing_Station_IP = req.body.IpAddress;
	let Printing_Station_ID = req.body.StnNo;
	let Printer_Name = req.body.Printer;

	stn.FindOne({'Printing_Station_IP': Printing_Station_IP}, function(Resp){
		if(Resp.Rec){
			log.WriteUserTrToDB(param, 'ManagePrintingStation', Printing_Station_IP, 'Failed To Create New Station ' + Printing_Station_ID + ' Using Ip: ' + Printing_Station_IP + '. Error: Ip Address Already In Use At Station ' + Resp.Rec.Printing_Station_ID, req.session.username);
			return res.send({Err: "Ip Address Already In Use At Different Station"});
		}

		stn.FindOne({'Printing_Station_ID':Printing_Station_ID}, function(Resp){
			if(Resp.Rec){
				log.WriteUserTrToDB(param, 'ManagePrintingStation', Printing_Station_ID, 'Failed To Create New Station ' + Printing_Station_ID + ' Using Ip: ' +Printing_Station_IP + '. Error: Stn Number Already In Use', req.session.username);
				return res.send({Err: "Stn Number Already In Use"});
			}

			let NewData = {
                Printing_Station_IP : Printing_Station_IP,
                Printing_Station_ID : Printing_Station_ID,
                Printer_Name   : Printer_Name
			}

			stn.New(NewData, function(Resp){
				log.WriteUserTrToDB(param, 'ManagePrintingStation', Printer_Name, 'Successfully Created Station ' +Printing_Station_ID + ' With Ip Address ' +  Printing_Station_IP, req.session.username);
				return res.send({Success: true});
			});
		});
	});
});

//Edit The Printing Station
router.post('/API/editPrintingStation', function (req, res){
	if(!req.session || !req.session.username){
		return res.send({Msg: "Session Expired"});
	}

	let loggedInUser = req.session.username;

	let Printing_Station_IP = req.body.IpAddress;
	let Printing_Station_ID = req.body.StnNo;
	let Printer_Name = req.body.Printer;

	stn.FindOne({'Printing_Station_ID': Printing_Station_ID}, function(Resp){
		if(Resp.Rec){
			let Record = Resp.Rec;
			let OldVal = Record.Printer_Name;
			let OldIP = Record.Printing_Station_IP;
			let PrinterMod = false;
			let IpMod = false;

			if(OldVal != Printer_Name){
				PrinterMod = true;
				
			}

			if(OldIP != Printing_Station_IP){
				IpMod = true;
			}

			Record.Printer_Name = Printer_Name;
			Record.Printing_Station_IP = Printing_Station_IP;
			

			stn.Update(Record, function(Resp){
				if(PrinterMod){
					log.WriteUserTrToDB(param, 'ManagePrintingStation',Printing_Station_ID, 'Modified Station ' + Printing_Station_ID + ' Printer from ' + OldVal + ' to ' + Printer_Name, req.session.username);
				}

				if(IpMod){
					log.WriteUserTrToDB(param, 'ManagePrintingStation', Printing_Station_ID, 'Modified Station ' + Printing_Station_ID + ' IpAddress from ' + OldIP + ' to ' + Printing_Station_IP, req.session.username);
				}

				return res.send({Success: true});
			});
		}
	});
});


//Delete The Printing Station
router.get('/API/deletePrintingStation', function (req, res){
	if(!req.session || !req.session.username){
		return res.send({Msg: "Session Expired"});
	}

	let loggedInUser = req.session.username;

	let DelStn = req.query.stn;

	stn.DeleteRecord({'Printing_Station_ID':DelStn}, function(Resp){
		log.WriteUserTrToDB(param, 'ManagePrintingStation', DelStn, 'Successfully Deleted Station ' + DelStn + ' From The System. ', req.session.username);
		res.send({Success: true});

	});
});

module.exports = router;