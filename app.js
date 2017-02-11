
var express = require('express')
  , routes = require('./app/server/routes')
  , authCallback = require('./app/server/auth-callback')
  , http = require('http')
  , path = require('path') 
  , bodyParser = require('body-parser')
  , errorHandler = require('errorhandler')
  , cookieParser = require('cookie-parser')
  , MongoStore = require('connect-mongo')(express.session) 
  // server info
  , domain = "socialsheduler.herokuapp.com"
  , port = process.env.PORT || 3000
  // passport / twitter stuff
  , config = require('./config')
  , passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy
  , twitterAuthn
  , twitterAuthz
  // poor man's database stub
  , user = { _id: "abc"}
  , userT = { id: "xxx" }
  , email = 'aaa@gmail.com'
  // oauth / twitter stuff
  , OAuth= require('oauth').OAuth
  , oa
  , $ = require('jquery')(require("jsdom").jsdom().defaultView);
  ;
  

var app = express();
var link = "tweet";
var AMTW = require('./app/server/modules/account-managerTw');
var AMA = require('./app/server/modules/account-manager');
var EM = require('./app/server/modules/email-dispatcher');
//****************************************************************++
function initTwitterOauth() {
  oa = new OAuth(
    "https://twitter.com/oauth/request_token"
  , "https://twitter.com/oauth/access_token"
  , config.consumerKey
  , config.consumerSecret
  , "1.0A"
  , "https://socialsheduler.herokuapp.com/twitter/auth/callback"
  , "HMAC-SHA1"
  );
}

function makeTweet(link,cb) {
  oa.post(
    "https://api.twitter.com/1.1/statuses/update.json"
  , userT.token
  , userT.tokenSecret
  , {"status": link}
  , cb
  );
}

function makeDm(sn, cb) {
  oa.post(
    "https://api.twitter.com/1.1/direct_messages/new.json"
  , userT.token
  , userT.tokenSecret
  , {"screen_name": sn, text: "test message via nodejs twitter api. pulled your sn at random, sorry."}
  , cb
  );
}

passport.serializeUser(function(_userT, done) {
  /*console.log('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
  console.log('userT.id:',userT.id);*/
  done(null, userT.id);
});

passport.deserializeUser(function(id, done) {
  /*console.log('dddddddddddddddddddddddddddddddddddddddddddd');
  console.log(JSON.stringify(userT));*/
  done(null, userT);
});

passport.serializeUser(function(_user, done) {
  /*console.log('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
  console.log('userT.id:',userT.id);*/
  done(null, userT.id);
});

passport.deserializeUser(function(id, done) {
  /*console.log('dddddddddddddddddddddddddddddddddddddddddddd');
  console.log(JSON.stringify(userT));*/
  done(null, user);
});

twitterAuthn = new TwitterStrategy({
    consumerKey: config.consumerKey
  , consumerSecret: config.consumerSecret
  //, callbackURL: "https://" + domain + ":" + port + "/twitter/authn/callback"
  , callbackURL: "https://" + domain + "/twitter/authn/callback"
  },
  function(token, tokenSecret, profile, done) {
    userT.token = token;
    userT.tokenSecret = tokenSecret;
    userT.profile = profile;
	userT.email = app.email;
	console.log('ccccccccccccccccccccccccccccccccccccccccccccc');
	//console.log(JSON.stringify(userT));
    done(null, userT);
  }
);
twitterAuthn.name = 'twitterAuthn';

twitterAuthz = new TwitterStrategy({
    consumerKey: config.consumerKey
  , consumerSecret: config.consumerSecret
  //, callbackURL: "https://" + domain + ":" + port + "/twitter/authz/callback"
  , callbackURL: "https://" + domain + "/twitter/authz/callback"
  , userTAuthorizationURL: 'https://api.twitter.com/oauth/authorize'
  },
  function(token, tokenSecret, profile, done) {
	console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    userT.token = token;
    userT.tokenSecret = tokenSecret;
    userT.profile = profile;
    userT.authorized = true;
	userT.email = app.email;
	
	initTwitterOauth();
	
	AMTW.addNewTwitterAccount({
			userT 	: userT
		}, function(e){
			if (e){
				console.log(e);
			}	else{
				console.log("added account");
			}
		});


    done(null, userT);
  }
);
twitterAuthz.name = 'twitterAuthz';

passport.use(twitterAuthn);
passport.use(twitterAuthz);

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/app/server/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.methodOverride());
// Passport needs express/connect's cookieParser and session
app.use(express.cookieParser());
// Passport needs express/connect's cookieParser and session

// build mongo database connection url //

/*var dbHost = process.env.DB_HOST || 'localhost'
var dbPort = process.env.DB_PORT || 27017;
var dbName = process.env.DB_NAME || 'node-login';*/
var dbHost = process.env.DB_HOST || 'ds149069.mlab.com'
var dbPort = process.env.DB_PORT || 49069;
var dbName = process.env.DB_NAME || 'heroku_hl6kkzw4';

//var dbURL = 'mongodb://'+dbHost+':'+dbPort+'/'+dbName;
/*if (app.get('env') == 'live'){
// prepend url with authentication credentials // 
	//dbURL = 'mongodb://'+process.env.DB_userT+':'+process.env.DB_PASS+'@'+dbHost+':'+dbPort+'/'+dbName;
}*/

var dbURL = process.env.MONGODB_URI || 'mongodb://root:1993@ds147599.mlab.com:47599/node-login';

app.use(express.session({
	secret: 'aaee445te5d14fe6f6d04637f78077c76c73d1b4',
	proxy: true,
	resave: true,
	saveUninitialized: true,
	store: new MongoStore({ url: dbURL })
	})
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/app/public'));

if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

//Tw Start

app.get('/twitter/authn', passport.authenticate('twitterAuthn'));
app.get(
  '/twitter/authn/callback'
, passport.authenticate(
    'twitterAuthn'
  , { failureRedirect: '/nfailure' }
  )
, function (req, res) {
    // TODO if a direct message fails, remove this and try again
    // the userT may have unauthorized the app
    if (!userT.authorized) {
      res.redirect('/twitter/authz');
      return;
    }
    res.redirect('/auth-callback');
  }
);
app.get('/twitter/authz', passport.authenticate('twitterAuthz'));
app.get(
  '/twitter/authz/callback'
, passport.authenticate(
    'twitterAuthz'
  , { successRedirect: '/home2'
    , failureRedirect: '/'
    }
  )
);

app.get('/twitter/tweet/:link', function (req, res) {
	makeTweet(req.params.link, function (error, data) {
    if(error) {
      console.log(require('sys').inspect(error));
      res.end('bad stuff happened (dm)');
    } else {
      console.log(data);
      res.end("Posted");
    }
  });
});


app.get('/twitter/direct/:sn', function (req, res) {
  makeDm(req.params.sn, function (error, data) {
    if(error) {
      console.log(require('sys').inspect(error));
      res.end('bad stuff happened (dm)');
    } else {
      console.log(data);
      res.end("the message sent (but you can't see it!");
    }
  });
});

app.get('/auth-callback', authCallback.index);
app.post('/auth-callback', authCallback.index);

initTwitterOauth;

require('./app/server/routes')(app);

http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});
