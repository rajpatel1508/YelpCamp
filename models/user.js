const mongoose = require('mongoose');
const schema = mongoose.Schema;
const passport = require('passport-local-mongoose');

const userschema = new schema({
    email: {
        type: String,
        required: true,
        unique: true
    }
});
userschema.plugin(passport);
module.exports = mongoose.model('User', userschema);