var moment                 = require('moment');
var rest                   = require('restler');
var net                    = require('net');
var async            	   = require('async');
var fs                     = require('fs');
var replace                = require('replace');
var exec                   = require('child_process').spawn;

var config                 = require('../config/sysconfig');
var paramLib	           = require('./classParam');

var param 		           = new paramLib();


function PrintProduct(Rec, PrintNo, StnRec, callback){
	let todaysDate = moment(new Date()).format('DD-MM-YYYY_HH_mm_ss');
	param.FindOne({'ParameterName':'ProductDetails'}, function(Resp){
		let Param = Resp.Param;
		if(!Param){
			return callback();
		}

		let TemplateDir = Param.Fields.TemplateDir;
		let OutputDir = Param.Fields.OutputDir;

		let Keywords = ['{Part_Number}',
		'{OE_No}',
		'{Description}',
		'{Bin_Location}'];

		let ReplaceVals = [];

		ReplaceVals.push(Rec.Part_Number);
		ReplaceVals.push(Rec.OE_No);
		ReplaceVals.push(Rec.Description);
		ReplaceVals.push(Rec.Bin_Location);

		let TemplateName =(Rec.Brand).replace('.jpg','.zpl');
		let inDir = TemplateDir+TemplateName;
		let outDir = OutputDir+todaysDate+"_"+TemplateName

		fs.copyFile(inDir,outDir, (err) => {
			if(err){
				console.log(({Err: 'printer Error: ' + err}))
				return callback();
			}

			for(let i = 0; i < Keywords.length ; i++){
				replace({
					 regex: Keywords[i],
					 replacement: ReplaceVals[i],
					 paths: [outDir],
					 recursive: true,
					 silent: true
				});
			}

			SendJobToPrinter(0, PrintNo, StnRec, outDir, function(){
				return callback();
			});
		});
	});
} /* PrintProduct */

function SendJobToPrinter(Index, NoOfPrints, StnRec, outDir, callback){
	if(Index >= NoOfPrints){
		return callback();
	}

	let child = exec("print", [StnRec.Printer_Name, outDir]);

	child.on('close', function(code) {
		try {
			console.log('Here with code ' + code);
		} catch(e){
		}

		Index++;
		return SendJobToPrinter(Index, NoOfPrints, StnRec, outDir, callback);
	});

	child.on('error', function(error) {
		console.log('Error while submitting to printer: ' + error);
		return callback();
	});
} /* SendJobToPrinter */

module.exports = class ProductPrint {
    constructor(){}

	PrintScannedProduct(Rec,PrintNo,StnRec,callback){
		PrintProduct(Rec,PrintNo,StnRec,function(){
		})
	}

}

