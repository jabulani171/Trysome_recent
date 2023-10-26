var db          = require('../db_schema/productDetail');
var moment      = require('moment');

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]"
}

function escapeRegExp(str) {
    if (!isString(str)) {
        return "";
    }
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function _DtGetData(req, loggedInUser, callback){
	let searchStr = {};

	let strSearch = req.body['search[value]'];
	let strSort = req.body['order[0][column]'];
	let SortIndex = 'columns['+ strSort +'][data]';
	let SortValue = req.body[SortIndex];
	let strSortDir = req.body['order[0][dir]'];
	let SortDir = -1;

	if(strSortDir == 'asc'){
		SortDir = 1;
	}

	let strSysSort = '{"' + SortValue + '":' + SortDir + '}';
	let SysSort = JSON.parse(strSysSort);

    if(strSearch){
		let regex = new RegExp(escapeRegExp(strSearch), "i");  //new RegExp(strSearch, "i");

		let Filters =  [{'Part_Number': regex},					
						{'OE_No': regex},
						{'Description': regex},					
						{'Bin_Location': regex},
						{'Brand': regex},
					    {'Footer': regex}];
						
		searchStr = { $or: Filters};
    }

     let all = {};
 
    db.countDocuments(all, function (err, c) {
		let recordsTotal=c;
		db.countDocuments(searchStr, function(err, c) {
			let recordsFiltered=c;
			db.find(searchStr, 'Part_Number OE_No Description Bin_Location Brand Footer',
							   {'skip': Number(req.body.start),
								'limit': Number(req.body.length),
								'sort': SysSort}, function (err, results) {
				if (err) {
					console.log('error while getting results'+err);
					return callback(null);
				}


				let ListData = [];
				let x = 0;
				while(x < results.length){
					let mData = {
						Part_Number: results[x].Part_Number,
						Header: results[x].Header,
						OE_No: results[x].OE_No,
						Description: results[x].Description,
						Bin_Location: results[x].Bin_Location,
						Brand:results[x].Brand,
						Footer:results[x].Footer

					}

					ListData.push(mData);
					x++;
				}

				let data = JSON.stringify({
                    "draw": req.body.draw,
                    "recordsFiltered": recordsFiltered,
                    "recordsTotal": recordsTotal,
                    "data": ListData
				});

				return callback(data);
			});
		});
	});
} /* _DtGetData */

function _CreateRecord(Object, callback){
	let Record = new db(Object);

	Record.save(function (err, savedDoc){
		return callback({Err:err, SavedDoc: savedDoc});
	});
} /* _CreateRecord */

function _ToCamelCase(str){
	return str.toLowerCase().replace(/(?:(^.)|(\s+.))/g, function(match){
		return match.charAt(match.length-1).toUpperCase();
	});
} /* ToCamelCase */

function _Update(UpdateObject, callback){
	let UpdateS = db(UpdateObject);
	
		UpdateS.save(function(err, savedDoc){
			return callback({Err:err, SavedDoc: savedDoc});
	});
		}/* Update */

module.exports = class ProductDetails {
    constructor(){}

    DtGetData(req, loggedInUser, callback){
		_DtGetData(req, loggedInUser, function(Resp){
			return callback(Resp);
		});
	} /* DtGetData */

    New(Object, callback){
		_CreateRecord(Object, function(Resp){
			return callback(Resp);
		});
	} /* New */

	Delete(KeyValuePair, callback){
			db.remove(KeyValuePair, function(err, Resp){
				if(err){
					return callback({Err: err})
				}
	
				return callback({DeleteResp: Resp});
			});

		
	} /* Delete */

	DeleteRecord(KeyValuePair, callback){
		db.deleteOne(KeyValuePair, function(err, Resp){
			if(err){
				return callback({Err: err})
			}

			return callback({DeleteResp: Resp});
		});
	} /* DeleteRecord */

	Find(KeyValuePair, callback){
		db.find(KeyValuePair, function(err, Arr){
			if(err){
				return callback({Err: err});
			}

			if(Arr.length > 0){
				return callback({Arr: Arr});
			}

			return callback({Arr: null});
		});
	} /* Find */

	FindOne(KeyValuePair, callback){
		db.findOne(KeyValuePair, function(err, Rec){
			if(err){
				return callback({Err: err});
			}

			if(!Rec){
				return callback({Rec: null});
			}

			return callback({Rec: Rec});
		});
	} /* FindOne */


	ToCamelCase(str){
		return _ToCamelCase(str);
	} /* ToCamelCase */

	Update(UpdateObject, callback){
		_Update(UpdateObject,function (err, savedDoc){
	return callback({Err:err,SavedDoc:savedDoc});
		});
	}

} /* ProductDetails */
