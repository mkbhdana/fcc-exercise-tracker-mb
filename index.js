'use strict'

const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require("mongoose")
const bodyParser = require("body-parser")
const port = process.env.PORT || 3000



mongoose.connect(process.env.MONGO_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

const ExerciseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    maxlength: [25, 'Description too long, not greater than 25']
  },
  duration: {
    type: Number,
    required: true,
    min: [1, 'Duration too short, at least 1 minute']
  },
  date: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: String,
    required: true
  }
})
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
});
const User = mongoose.model("User", UserSchema);
const Exercise = mongoose.model("Exercise", ExerciseSchema);


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.route('/api/users').get((req, res) => {
  User.find({}, (error, data) => {
    res.json(data);
  });
}).post((req, res) => {
  User.findOne({ "username": req.body.username }, (err, userData) => {
    if (err || userData) {
      res.send("username already taken");
    } else {
      const newUser = new User({
        username: req.body.username
      })
      newUser.save((err, data) => {
        const reducedData = {
          "username": data.username,
          "_id": data._id
        };
        if (err || !data) {
          res.send("There was an error saving the user")
        } else {
          res.json(reducedData)
        }
      })
    }
  })

})

app.post("/api/users/:_id/exercises", (req, res) => {
  const id = req.body[":_id"] || req.params._id
  const { description, duration, date } = req.body
  User.findById(id, (err, userData) => {
    if (err || !userData) {
      res.send("Could not find user");
    } else {
      const newExercise = new Exercise({
        userId: id,
        description,
        duration,
        date: date || Date.now()
      })
      newExercise.save((err, data) => {
        if (err || !data) {
          res.send("There was an error saving this exercise")
        } else {
          const { description, duration, date, _id } = data;
          res.json({
            username: userData.username,
            description,
            duration,
            date: date.toDateString(),
            _id: userData.id
          })
        }
      })
    }
  })
})

app.get("/api/users/:_id/logs", (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.body[":_id"] || req.params._id
  User.findById(id, (err, userData) => {
    if (err || !userData) {
      res.send("Could not find user");
    } else {
      let dateObj = {}
      if (from) {
        dateObj[`$gte`] = new Date(from)
      }
      if (to) {
        dateObj[`$lte`] = new Date(to)
      }
      let filter = {
        userId: id
      }
      if (from || to) {
        filter.date = dateObj
      }
      let nonNullLimit = limit ?? 500
      Exercise.find(filter).limit(+nonNullLimit).exec((err, data) => {
        if (err || !data) {
          res.json([])
        } else {
          const count = data.length
          const rawLog = data
          const { username, _id } = userData;
          const log = rawLog.map((l) => ({
            description: l.description,
            duration: l.duration,
            date: l.date.toDateString()
          }))
          res.json({ username, count, from, to, _id, log })
        }
      })
    }
  })
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})