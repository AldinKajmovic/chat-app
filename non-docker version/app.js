var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var http = require('http');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const pg = require('pg');
const expressSession = require('express-session');
const pgSession = require('connect-pg-simple')(expressSession);

const session = require('express-session');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var groupChatRouter = require('./routes/crud');
let registerRouter = require('./routes/register');
let loginRouter = require('./routes/login');

var app = express();
const server = createServer(app);
const io = new Server(server);
const chat = require('./sockets/chat');
chat(io);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};
const pgPool = new pg.Pool(config);

app.use(expressSession({
  store: new pgSession({
    pool: pgPool
  }),
  secret: process.env.FOO_COOKIE_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 * 30} // trenutno traje 30 dana
}));

// Middleware za provjeru sesije, koji izuzima "/ludilo" stranicu
app.use((req, res, next) => {

  if (req.originalUrl === '/login' || req.originalUrl === '/register') {
    return next();
  }

  if (req.session && req.session.userData) {
    const {id, username} = req.session.userData;
    const sessionExpiry = req.session.cookie._expires;
    const now = new Date();

    if(sessionExpiry > now){
      return next();
    }else{
      return res.redirect("/login");
    }

    return next();
  } else {
    return res.redirect("/login");
  }
});




app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/chat', groupChatRouter);
app.use('/register', registerRouter);
app.use('/login', loginRouter);

app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});


server.listen(3001, () => {
});

module.exports = app;
