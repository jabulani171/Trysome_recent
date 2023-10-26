var mongoose         	= require('mongoose');
var moment           	= require('moment');
var glob             	= require('glob');
var fs               	= require('fs');
var async            	= require('async');
var LineByLineReader 	= require('line-by-line');
var exec             	= require('child_process').spawn;

var config           	= require('../config/sysconfig');
var logging          	= require('../lib/classLogging');
var parameter        	= require('../lib/classParam');
var ProductDetailLib      = require('../lib/classProductDetails');
var aeLib               = require('../lib/classAE');
var FileErrorLib        = require('../lib/classFileError');

var detail	   	        = new ProductDetailLib();
var log            	    = new logging();
var param          	    = new parameter();
var ae                  = new aeLib();
var fileErr             = new FileErrorLib();

let ProcName            = 'FILE_INT';
var DirectorySetting    = null;

/* Mongo Connection */
mongoose.connect(config.mongoDB.url,{"useNewUrlParser" : true }, function (error, client) {
    if (error) {
        log.WriteToFile(ProcName, 'MongoDB: Connection Error: ' + error);
    } else {
        log.WriteToFile(ProcName, 'MongoDB: Connection Established.');
		WaitForTrigger();
    }
}); /* Mongo Connection */

function WriteFileErrorLog(ErrMsg, FileName, ScriptNo){
	let NewErr = {
	  CreateDate         : moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
	  FileName           : FileName,
          ScriptNo           : ScriptNo,
          Direction          : 'INCOMING',
	  ErrorDescription   : ErrMsg
	};

	fileErr.New(NewErr, function(Resp){
		return;
	});
} /* WriteFileErrorLog */

function ValidateFile(task, callback){
	let FullFilePath = task.path + task.filename;
	let FileArr = FullFilePath.split('/');
	let FileName = FileArr[FileArr.length -1];
	let FirstLine = true;
	let LineError = false;
	let DataLineCount = 0;
	let ErrorMsg = null;
	let MyFile = task.filename;
	let MyFileArr = MyFile.split('.');

	if(MyFileArr.length < 2){
		ErrorMsg = 'Failed to read file | Incorrect file type.';

		WriteFileErrorLog('Failed to read file. The file type is incorrect.', MyFile, '');

		MoveFileAccordingly(FullFilePath, false, ErrorMsg, function(){
			return callback();
		});

		return;
	}

	if(MyFileArr[MyFileArr.length -1] != DirectorySetting.FileExtension){
		ErrorMsg = 'Failed to read file | Incorrect file extension.';

		WriteFileErrorLog('Failed to read file. The file extension does not match the extension [' + DirectorySetting.FileExtension + '] expected by the system.', MyFile, '');

		MoveFileAccordingly(FullFilePath, false, ErrorMsg, function(){
			return callback();
		});

		return;
	}

	fs.appendFileSync(FullFilePath, '\n');

	let lrNew = new LineByLineReader(FullFilePath,{ skipEmptyLines: true });

	lrNew.on('error', function (err){
		ErrorMsg = 'Failed to read file | Err: ' + err;

		WriteFileErrorLog('Failed to read file. Error occured: ' + err, MyFile, '');

		MoveFileAccordingly(FullFilePath, false, ErrorMsg, function(){
			return callback();
		});

		return;
	});

	lrNew.on('line', function (line){
	
		lrNew.pause();

		DataLineCount++;

		let LineDataArr = line.split(DirectorySetting.Delimeter);

		if(FirstLine == true && DirectorySetting.FileIncludesHeader == true){
			FirstLine = false;
			lrNew.resume();
		} else {
			if(LineDataArr.length != DirectorySetting.NoOfColumns){
				ErrorMsg = 'Line [' + (DataLineCount) + '] in file | Columns count mismatch [' + LineDataArr.length + '] | Expected [' + DirectorySetting.NoOfColumns + '] - [' + LineDataArr[3] + '] | [' + line + ']';

				WriteFileErrorLog('Error at line ' + (DataLineCount) + ': Number of columns (' + LineDataArr.length + ') does not match expected column count of (' + DirectorySetting.NoOfColumns + ')' , MyFile, '');
				LineError = true;
				lrNew.resume();
			} else {
				GetDetail({'Part_Number': LineDataArr[0]}, function(Resp){
					let ProductRecList = Resp.Arr;

					if(ProductRecList){

						detail.DeleteRecord(ProductRecList[0],function(Resp){
						});
						LineError = false;
					}

					let n = 0;
					while(n < LineDataArr.length){
						if(n != 47){
							let strFieldVal = LineDataArr[n];
							if (strFieldVal.indexOf(';') >= 0){
								WriteFileErrorLog('Error at line ' + (DataLineCount) + ': One or more fields contain a semi-colon character (;)', MyFile, LineDataArr[0]);
								LineError = true;
							}
						}
						n++;
					}

					lrNew.resume();
				});
			}
		}
	
	});

	lrNew.on('end', function (){
		if(LineError == false && DataLineCount > 1){
			param.FindOne({'ParameterName': 'SystemBatchIdSettings'}, function(Resp){
				if(Resp.Err){
					log.WriteToFile(ProcName, 'Failed to find [System Products] parameters. | Err: ' + Resp.Err);
					return callback();
				}

				if(!Resp.Param){
					log.WriteToFile(ProcName, 'System Products parameters are not setup on the system');
					return callback();
				}

				let SysSettings = Resp.Param;

				ProcessFile(FullFilePath, SysSettings, function(Resp){
					let Success = true;
					if(Resp.Err){
						ErrorMsg = Resp.Err;
						Success = false;
					} else {
						ErrorMsg = 'File processed successfully';
					}

					MoveFileAccordingly(FullFilePath, Success, ErrorMsg, function(){
						return callback();
					});
				});

			});
		} else {
			if(DataLineCount <= 1 && !LineError){
				ErrorMsg = 'File is empty';

				WriteFileErrorLog('Failed to read file. File is empty', MyFile, '');
			}

			MoveFileAccordingly(FullFilePath, false, ErrorMsg, function(){
				return callback();
			});
		}
	});
} /* ValidateFile */

function MoveFileAccordingly(File, Success, Msg, callback){
	console.log('Original path: ' + File);
	let Dest = DirectorySetting.Processed;

	let FileArr = File.split('\\');

	if(FileArr.length <= 1){
		FileArr = File.split('/');
	}


	let FileName = FileArr[FileArr.length -1];

	log.WriteToFile(ProcName, 'filename without path: ' + FileName);

	if(Success == false){
		Dest = DirectorySetting.Failed;
	}

	log.WriteToFile(ProcName, 'Dest path: ' + Dest);
	log.WriteToFile(ProcName, 'Dest path with filename: ' + Dest + FileName);

	fs.readFile(File, function (err, data) {
		if(err){
			log.WriteToFile(ProcName, 'Error reading the file: Err - ' + err);
			return callback();
		}

		if(!data){
			data = "Error";
		}

		fs.writeFile(Dest + FileName, data, function(err) {
			fs.unlink(File, function (err) {
				if(err){
					log.WriteToFile(ProcName, 'Failed to rename file ' + err);
				}

				log.WriteToFile(ProcName, Msg);

				let TrStatus = 'FAILED';
				if(Success){
					TrStatus = 'SUCCESS';
				}

				log.WriteTransactionToDB(FileName, 'New Incoming File For Process', Msg, 'INCOMING', TrStatus, 'FILE INTEGRATION', function(err, saveDoc){
					let NewAE = {
						Type: 'FILE INTEGRATION',
						UsersViewed: [],
						Message: FileName + ' - ' + Msg,
						CreateDate: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
					}

					ae.New(NewAE, function(Resp){
						return callback();
					});
				});
			});
		});
	});
} /* MoveFileAccordingly */

function GetDetail(Obj, callback){
	detail.Find(Obj, function(Resp){
		return callback(Resp);
	});
} /* GetDetail */

function ProcessFile(file, SysSettings, callback){
	let FirstLine = true;
	let LineError = false;
	
	let ErrorMsg = null;
	let FileProducts = [];
	let FileProductsDesc = [];
	let HeaderRecord = null;
	SysSettings.Fields.SystemBatchIdSequence++;
	
	

	param.Update(SysSettings, function(Resp){


			console.log('Processing lines now...');

			let lrNew = new LineByLineReader(file,{ skipEmptyLines: true });

			lrNew.on('error', function (err){
				ErrorMsg = 'Failed to read file [' + file + ']. | Err: ' + err;
				return callback({Err: ErrorMsg});
			});

			lrNew.on('line', function (line){
				console.log(line);

				if(!LineError){
					lrNew.pause();
					let LineDataArr = line.split(DirectorySetting.Delimeter);

					if(FirstLine == true && DirectorySetting.FileIncludesHeader == true){
						FirstLine = false;
						lrNew.resume();
					} else {
						let NewDetail = {
							Part_Number: LineDataArr[0],  
								OE_No: LineDataArr[1],
								Description: LineDataArr[2],
								Bin_Location: LineDataArr[3],
								Brand:	LineDataArr[4],
								Footer: LineDataArr[5]
										
							
						};

						
								detail.New(NewDetail, function(Resp){		
										lrNew.resume();
								});
								HeaderRecord = {  
									Part_Number: NewDetail.Part_Number,
								
									OE_No: NewDetail.OE_No,
									Description: NewDetail.Description,
									Bin_Location: NewDetail.Bin_Location,
									Brand:	NewDetail.Brand,
									Footer: NewDetail.Footer
								}
					
					}
				}
			});

			lrNew.on('end', function(){
				CompleteFileReceive(HeaderRecord, LineError, ErrorMsg, file, function(Resp){
					if(FileProducts.length > 0){
						UpdateSysProducts(FileProducts, FileProductsDesc, function(){

							console.log(Resp);
							return callback(Resp);
						});
						return;
					}
					return callback(Resp);
				});
			});

	});
} /* ProcessFile */

function CompleteFileReceive(HeaderRecord, LineError, ErrorMsg, file, callback){
	let Err = null;
	if(LineError){
		Err = ErrorMsg;
	}

	if(LineError){
		detail.Delete({'Part_Number': HeaderRecord.Part_Number}, function(Resp){

				return callback({Err: Err});
		
		});
	} else {
			let Msg = 'Successfully created Batch ' + HeaderRecord.Part_Number + ' in from File ' + file;
			log.WriteToFile(ProcName, Msg);
			return callback({Err: Err});
	}
} /* CompleteFileReceive */

function UpdateSysProducts(FileProducts, FileProductsDesc, callback){
	param.FindOne({'ParameterName': 'SystemProductSettings'}, function(Resp){
		if(Resp.Err){
			log.WriteToFile(ProcName, 'Failed to find [System Products] parameters. | Err: ' + Resp.Err);
			return callback();
		}

		if(!Resp.Param){
			log.WriteToFile(ProcName, 'System Products parameters are not setup on the system');
			return callback();
		}




		let Products = Resp.Param.Fields.Products;

		let x = 0;
		while(x < FileProducts.length){
			let y = 0;
			let Found = false;
			while(y < Products.length){
				if(Products[y].name == FileProducts[x]){
					Found = true;
					break;
				}
				y++;
			}

			if(!Found){
				let ProdRec = {name: FileProducts[x], Description: FileProductsDesc[x]};
				Products.push(ProdRec);

				console.log()
			}
			x++;
		}

		Resp.Param.Fields.Products = Products;
		param.Update(Resp.Param, function(Resp){
			return callback();
		});
	});
} /* UpdateSysProducts */

function ProcessEachFile(files, index, path, callback){
	if(index >= files.length){
		return callback();
	}

	let FileName = files[index];
	ValidateFile({path: path, filename: FileName}, function(){
		index++;
		return ProcessEachFile(files, index, path, callback);
	});
} /* ProcessEachFile */

function FindNewFiles(callback){
	let path = DirectorySetting.New;

	fs.readdir(path, function(err, files){
		if(err){
			log.WriteToFile(ProcName, 'Failed to find new  files in [' + DirectorySetting.New + ']. | Err: ' + err );
			return callback();
		}

		if(!files || files.length <= 0){
			return callback();
		}

		let x = 0;
		log.WriteToFile(ProcName, files.length + ' File(s) available to pickup');

		console.log(files);

		ProcessEachFile(files, 0, path, function(){
			console.log('The queue has finished processing!');

			return callback();
		});
	});
} /* FindNewFiles */

function CheckFilesInDir(callback){

	param.FindOne({'ParameterName': 'FileIntegration'}, function(Resp){
		if(Resp.Err){
			log.WriteToFile(ProcName, 'Failed to find [File Integration] parameters. | Err: ' + Resp.Err);
			return callback();
		}

		if(!Resp.Param){
			log.WriteToFile(ProcName, 'File Integration parameters are not setup on the system');
			return callback();
		}

		DirectorySetting = Resp.Param.Fields;
		FindNewFiles(function(){
			return callback();
		});
	});
}; /* CheckFilesInDir */

function WaitForTrigger(){
	setTimeout(function(){
	  	CheckFilesInDir(function(){
			WaitForTrigger();
		});
	}, 10000);
} /* WaitForTrigger */



