const express = require('express');
const cors = require('cors');
const http = require("node:http");
const { Server } = require("socket.io");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const dotenv = require('dotenv')

const socketConnection = require('./socket');
const razorpayRoutes = require('./razorpay');

const app = express();

const allowedOrigins = [process.env.frontend_url];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
dotenv.config()
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_KEY,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/api/payment', razorpayRoutes);
passport.use(new GoogleStrategy({
    clientID: process.env.GOAUTH_CLIENTID,
    clientSecret: process.env.GOAUTH_SECRET,
    callbackURL: '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

const server = http.createServer(app);
const io = new Server(server, {
    cors : {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const chatRooms = new Map();

socketConnection(io, chatRooms)

setInterval(() => {
  const now = Date.now();
  for (const [roomCode, room] of chatRooms.entries()) {
    if (now - room.createdAt > 24 * 60 * 60 * 1000) {
      chatRooms.delete(roomCode);
      console.log(`Cleaned up old game room: ${roomCode}`);
    }
  }
}, 60 * 60 * 1000);

app.get('/', (req, res) => {
    res.json({
        status: 'ok', 
        activeRooms: chatRooms.size,
        timestamp: new Date().toISOString()
    })
})
app.get('/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: process.env.frontend_url }),
  (req, res) => {
    res.redirect(`${process.env.frontend_url}/?auth=success`);
  }
);

app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {    
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});


