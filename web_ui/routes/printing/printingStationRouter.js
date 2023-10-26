var express        = require('express');
var mustache       = require('mustache');
var formidable     = require("formidable");
var async          = require('async');
var moment 		   = require('moment');
//var rest           = require('restler');
var redis          = require('redis');
var exec           = require('child_process').spawn;

var port           = require('../../../config/sysconfig').port;
var HtmlLib	       = require('../../../lib/classHtml');
var StnLib         = require('../../../lib/classPrintingStation');
var ProductDetailLib = require('../../../lib/classProductDetails');
var ProductPrintLib = require('../../../lib/classProductPrint');
const { Console } = require('console');

var router         = express.Router();
var html           = new HtmlLib();

var stn            = new StnLib();
var prodDetails        = new ProductDetailLib();
var prodPrint        = new  ProductPrintLib();

//PublishClient      = redis.createClient();

function ShowPrintingStation(Resp, loggedInUser, req, res){
	let frame = {};
	let page = html.GetPage(null);
	let StnIP = null;
	frame.ext = html.GetPage('printingStation');
	let Data = html.GetEmptyPage(loggedInUser);

	if(req.session.UserPriv.indexOf('OperatePrintingStation') >= 0){
		Data.Granted = true;
	}

    if(Data.Granted){
        StnIP = html.GetIpAddress(req);

        stn.FindOne({'Printing_Station_IP':StnIP},function(Resp){
            if(!Resp.Rec){
				Data.StnIP = StnIP;

				let htmlpage = mustache.render(page, Data, frame);
				return res.send(htmlpage);
			}
            else{
            StnRec = Resp.Rec;

            Data.Station = StnRec.Printing_Station_ID;

                    let htmlpage = mustache.render(page, Data, frame);
                    res.send(htmlpage);
        }
        });
    }
} 

router.get('/API/printingstation', html.requireLogin, function (req, res) {
	let loggedInUser = req.session.username;

	ShowPrintingStation(null, loggedInUser, req, res);
});

router.post('/API/PrintingStation', function (req, res){
	let loggedInUser = req.session.username;

	let Part_Number = req.body.Part_Number;
    let PrintNo = req.body.PrintNo;
   

    prodDetails.FindOne({'Part_Number':Part_Number},function(Resp){
        if(!Resp.Rec){
            return res.send({Err:'Part_Number Not Found on the System'});
        }
        let Rec = Resp.Rec;
        let obj = {};
        let StnIP = html.GetIpAddress(req);

        stn.FindOne({"Printing_Station_IP":StnIP},function(Resp){
            if(!Resp.Rec){
                res.send({Err:'IP Address Not Found'});
            }
            let StnRec = Resp.Rec;

            prodPrint.PrintScannedProduct(Rec,PrintNo,StnRec,function(){
                });
        });
        obj =  {
            Part_Number:Rec.Part_Number,
            PrintNo:PrintNo
        };
        res.send(obj);
});
});
module.exports = router;