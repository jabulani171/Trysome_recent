var express        = require('express');
var https          = require('https');
var bodyParser     = require('body-parser')
var mongoose       = require('mongoose');
var fs             = require('fs');
var moment         = require('moment');
var mustache       = require('mustache');
var async          = require('async');
var formidable     = require('formidable');
var session        = require('client-sessions')
var dbUrl          = require('../config/sysconfig').mongoDB.url;
var port           = require('../config/sysconfig').ui_port;
var logging        = require('../lib/classLogging');
var HtmlLib	       = require('../lib/classHtml');
var app            = express();

var log            = new logging();
var html           = new HtmlLib();

var ProcName       = 'UI';

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());

app.use(session({
  cookieName: 'session',
  secret: 'eg[isfd-8yF9-7w2315df{}+Ijsli;;to8',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  httpOnly: true,
  secure: true,
  ephemeral: true
}));

/********************* DB Connection ***********************************/
var FirstConnect = true;
DbConnect();

function DbConnect(){
	mongoose.connect(dbUrl,{"useNewUrlParser" : true });
} /* DbConnect */

function DbDisconnect(){
  	mongoose.connection.close(function (){
		log.WriteToFile(ProcName, 'Cleared DB Link');
		setTimeout(function(){
			DbConnect();
		}, 10000);
  	});
} /* DbDisconnect */

mongoose.connection.on('connected', function () {
	log.WriteToFile(ProcName, 'MongoDB: Connection Established.');
	if(FirstConnect){
		app.listen(port);
		FirstConnect = false;
	}
	log.WriteToFile(ProcName,'Server running at http://127.0.0.1:' + port + '/');
});

mongoose.connection.on('error',function (err) {
	log.WriteToFile(ProcName, 'MongoDB: Connection Error: ');
	return DbDisconnect();
});

mongoose.connection.on('disconnected', function () {
	log.WriteToFile(ProcName, 'Mongoose default connection disconnected');
	return DbDisconnect();
});

/********************* routes *****************************************/

var loginRouter       = require('./routes/login/loginRouter.js');
var userUtilsRouter   = require('./routes/utils/createUserUtil.js');
var indexRouter       = require('./routes/index.js');
var userRouter        = require('./routes/user/userRouter.js');
var paramRouter       = require('./routes/params/paramRouter.js');
var trLogging         = require('./routes/trLogging/trLoggingRoute.js');
var productRouter       = require('./routes/product/productRouter.js');
var printingRouter   = require('./routes/printing/printingRouter.js');
var printingStationRouter   = require('./routes/printing/printingStationRouter.js');

app.use(loginRouter);
app.use(userUtilsRouter);
app.use(indexRouter);
app.use(userRouter);-
app.use(paramRouter);
app.use(trLogging);
app.use(productRouter);
app.use(printingRouter);
app.use(printingStationRouter);


app.get('*', function(req, res){
  	html.WEB_CallPageRedirect(res, '/API/');
});

module.exports = app
