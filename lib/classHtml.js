var moment    = require('moment');
var mustache  = require('mustache');
var fs        = require('fs');

var conf      = require('../config/sysconfig');

var ext;
var page;

var Template = {
	default: {
		name: 'default',
		page: null
	},
	frame: [{
		name: null,
		page: null
	}]
}

function _CreateDefaultView(user){
	let userID = user;
	let sockurl = conf.server_ip + ':' + conf.sockIOport;
	let serverurl = conf.server_ip + ':' + conf.port;
	if(!userID){
		userID = '';
	}

	let View = {
		user: userID,
		alertMsg: '',
		SocketIOUrl: sockurl,
		DefaultUrl: serverurl
	};

	return View;
}

function _diff_minutes(dt2, dt1){
  let diff =(dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
} /* _diff_minutes */

function _WEB_CallPageRedirect(res, Url){
	res.statusCode = 302;
	res.setHeader('Location',Url);
	res.end();
} /* _WEB_CallPageRedirect */

module.exports = class Html {

    constructor(){
		let data = {};

		Template.default.page = fs.readFileSync('./web_ui/view/index.html', "utf8");
		Template.frame.push(data);

		data = {};
		data.page = fs.readFileSync('./web_ui/view/login.html', "utf8");
		data.name = 'login';
		Template.frame.push(data);

		data = {};
		data.page = fs.readFileSync('./web_ui/view/trLogging.html', "utf8");
		data.name = 'trloglist';
		Template.frame.push(data);

		data = {};
		data.page = fs.readFileSync('./web_ui/view/aeLogging.html', "utf8");
		data.name = 'aeloglist';
		Template.frame.push(data);

		data = {};
		data.page = fs.readFileSync('./web_ui/view/userTrLogging.html', "utf8");
		data.name = 'usertrloglist';
		Template.frame.push(data);

		data = {};
		data.page = fs.readFileSync('./web_ui/view/userList.html', "utf8");
		data.name = 'user';
		Template.frame.push(data);

		data = {};
		data.page = fs.readFileSync('./web_ui/view/paramList.html', "utf8");
		data.name = 'param';
		Template.frame.push(data);

		data = {};
		data.page = fs.readFileSync('./web_ui/view/groupScreen.html', "utf8");
		data.name = 'groupscreen';
		Template.frame.push(data);

		data = {};
		data.page = fs.readFileSync('./web_ui/view/productDetails.html', "utf8");
		data.name = 'productDetails';
		Template.frame.push(data);

		data = {};
		data.page = fs.readFileSync('./web_ui/view/createUser.html', "utf8");
		data.name = 'createUser';
		Template.frame.push(data);

		data = {};
		data.page = fs.readFileSync('./web_ui/view/printingStationList.html', "utf8");
		data.name = 'printingStationList';
		Template.frame.push(data);

		data = {};
		data.page = fs.readFileSync('./web_ui/view/printingStation.html', "utf8");
		data.name = 'printingStation';
		Template.frame.push(data);

		mustache.parse(Template.default.page);
	} /* constructor */

	GetPage(FrameName){
		if(!FrameName){
			return Template.default.page;
		}

		let x = 0;
		while(x < Template.frame.length){
			if(Template.frame[x].name == FrameName){
				return Template.frame[x].page;
			}

			x++;
		}

		return "";
	} /* GetPage */

	GetLoginPage(ViewData, user){
		let view = _CreateDefaultView(user);

		if(ViewData){
			if(ViewData.Msg){
				view.alertMsg = ViewData.Msg;
			}
		}

		return view;
	} /* GetLoginPage */

	GetEmptyPage(user){
		return _CreateDefaultView(user);
	} /* GetEmptyPage */

	requireLogin (req, res, next){
		if(!req.session){
			return _WEB_CallPageRedirect(res, '/API/login');
		}

		if(!req.session.username){
			return _WEB_CallPageRedirect(res, '/API/login');
		}

	  	let now = new Date();
		if(req.session.expiration){
			let ex = new Date(req.session.expiration);
			let diff = _diff_minutes(ex, now);
			if(diff > 45){
				req.session.expiration = null;
				return _WEB_CallPageRedirect(res, '/API/login');
			}
		}

		req.session.expiration = now;
		next();
	} /* requireLogin */

	WEB_CallPageRedirect(res, Url){
		_WEB_CallPageRedirect(res, Url);
	} /* WEB_CallPageRedirect */

	GetIpAddress(req){
		let ClientIP = req.headers['x-forwarded-for'] ||
								req.connection.remoteAddress ||
								req.socket.remoteAddress ||
								req.connection.socket.remoteAddress;

		if (ClientIP.substr(0, 7) == "::ffff:"){
			ClientIP = ClientIP.substr(7)
		}
		return ClientIP;
	} /* GetIpAddress */
}
