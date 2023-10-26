var db          = require('../db_schema/FileError');
var moment      = require('moment');

function _CreateRecord(Object, callback){
	let Record = new db(Object);

	Record.save(function (err, savedDoc){
		return callback({Err:err, SavedDoc: savedDoc});
	});
} /* _CreateRecord */

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]"
}

function escapeRegExp(str) {
    if (!isString(str)) {
        return "";
    }
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function _DtGetDataQuery(req, Query, loggedInUser, searchStr, callback){
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

    let all = {};

    db.countDocuments(all, function (err, c) {
		let recordsTotal=c;
		db.aggregate([
		  {
			"$set": {
			  "CreateDate": {
				"$dateFromString": {
				  "dateString": "$CreateDate"
				}
			  }
			}
		  },
		  {
			"$match": searchStr
		  },{
			'$count': "totalCount"
		  }
		], function (err, resultsA) {
			let recordsFiltered = 0;
			if(resultsA && resultsA.length > 0){
				recordsFiltered = resultsA[0].totalCount;
			}

			db.aggregate([
			  {
				"$set": {
				  "CreateDate": {
					"$dateFromString": {
					  "dateString": "$CreateDate"
					}
				  }
				}
			  },
			  {
				"$match": searchStr
			  },{
				'$skip': Number(req.body.start)
			  },{
				'$limit': Number(req.body.length)
			  },{
				'$sort': SysSort
			  }
			], function (err, results) {
				if (err) {
					console.log('error while getting results'+err);
					return callback(null);
				}

				let ListData = [];
				let x = 0;
				while(x < results.length){
					let mData = {
						CreateDate: results[x].CreateDate,
						FileName: results[x].FileName,
						ScriptNo: results[x].ScriptNo,
						Direction: results[x].Direction,
						ErrorDescription: results[x].ErrorDescription
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
} /* _DtGetDataQuery */

module.exports = class FileError {
    constructor(){}

    DtGetDataQuery(req, Query, loggedInUser, searchStr, callback){
		_DtGetDataQuery(req, Query, loggedInUser, searchStr, function(Resp){
			return callback(Resp);
		});
	} /* DtGetDataQuery */

    New(Object, callback){
		_CreateRecord(Object, function(Resp){
			return callback(Resp);
		});
	} /* New */

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

	Update(UpdateObject, callback){
		if(!UpdateObject){
			return callback({SavedDoc:null});
		}

		UpdateObject.save(function(err, savedDoc){
			return callback({SavedDoc: savedDoc});
		});
	} /* Update */

} /* FileError */
