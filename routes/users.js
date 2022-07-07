const express = require('express');
const passport = require('passport');
const router = express.Router();
const user = require('../models/user');
const catchAsync = require('../utils/catchAsync');

router.get('/register', (req, res) => {
    res.render('users/register');
})

router.post('/register', catchAsync(async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const User = new user({ email, username });
        const registered = await user.register(User, password);
        req.login(registered, err => {
            if (err) {
                return next(err);
            }
            req.flash('success', 'welcome to Yelp camp');
            res.redirect('/campgrounds');
        })
    }
    catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
}))

router.get('/login', (req, res) => {
    res.render('users/login');
})

router.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome back!');
    const redirecturl = req.session.returnTo || '/campgrounds';
    res.redirect(redirecturl);
})

router.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
    });
    req.flash('success', 'goodbye!');
    res.redirect('/');
})

module.exports = router;