const express = require('express'),
      session = require('express-session'),
      bodyParser = require('body-parser'),
      massive = require('massive'),
      passport = require('passport'),
      LocalStrategy = require('passport-local').Strategy,
      FacebookStrategy = require('passport-facebook').Strategy,
      config = require('./config.js'),
      cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: 'keyboardcat'
}))
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static('./public'));



///////////////
// DATABASE //
/////////////
//need to update to match to a database I have access to
// const massiveInstance = massive.connectSync({connectionString: 'postgres://localhost/sandbox'})
var connectionString = "postgres://postgres:" + config.pgresPwrd + "@localhost:5433/Massivedemo";
var massiveInstance = massive.connectSync({connectionString: connectionString});
app.set('db', massiveInstance);

app.set('db', massiveInstance);
const db = app.get('db');

// this is just one time to add a user to the database just for example
// db.createUser(function(err, user) {
//   if (err) console.log(err);
//   else console.log('CREATED USER');
//   console.log(user);
// })


passport.use(new LocalStrategy(
  function(username, password, done) {
    db.getUserByUsername([username], function(err, user) {
      user = user[0];
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (user.password != password) { return done(null, false); }
      return done(null, user);
    })
  }
))

passport.use(new FacebookStrategy({
  clientID: config.facebook.clientID,
  clientSecret: config.facebook.clientSecret,
  callbackURL: "http://localhost:" + config.port + "/auth/facebook/callback",
  profileFields: ['id', 'displayName']
},
function(accessToken, refreshToken, profile, cb) {
  db.getUserByFacebookId([profile.id], function(err, user) {
    user = user[0];
    if (!user) {
      console.log('CREATING USER');
      db.createUserFacebook([profile.displayName, profile.id], function(err, user) {
        console.log('USER CREATED', user);
        return done(err, user); //done was cb
      })
    } else {
      return done(err, user); //done was cb
    }
  })
}));

// used when leaveing the server
passport.serializeUser(function(user, done) {
  done(null, user.id);
})

// used when coming into the server
passport.deserializeUser(function(id, done) {
  // need to fix here
  db.getUserById([id], function(err, user) {
    user = user[0];
    if (err) console.log(err);
    else console.log('RETRIEVED USER');
    console.log(user);
    done(null, user);
  })
})


app.post('/auth/local', passport.authenticate('local'), function(req, res) {
   // Use passport local strategy if success 200 else 401
  res.status(200).send();
});

app.get('/auth/facebook', passport.authenticate('facebook'))

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {successRedirect: '/' }), function(req, res) {
    res.status(200).send(req.user);
  })


app.get('/auth/me', function(req, res) {
   // Return the user object stored in the session
  if (!req.user) return res.sendStatus(404);
  res.status(200).send(req.user);
})


app.get('/auth/logout', function(req, res) {
  req.logout();
  res.redirect('/');
})

app.listen(config.port,function(){
  console.log('listening on port'+config.port)
})
