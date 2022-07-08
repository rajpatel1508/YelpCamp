if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const campground = require('./models/campground');
const methodoverride = require('method-override');
const ejsmate = require('ejs-mate');
const catchAsync = require('./utils/catchAsync');
const expresserrors = require('./utils/expresserrors');
const joi = require('joi');
const Review = require('./models/review');
const { read } = require('fs');
const Campgrounds = require('./routes/campgrounds');
const Userroute = require('./routes/users');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const passportlocal = require('passport-local');
const user = require('./models/user');
const { isloggedin } = require('./middleware');
const mongoSanitize = require('express-mongo-sanitize');
const { options } = require('joi');
const mongoDBStore = require('connect-mongo');
const dburl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';

mongoose.connect(dburl)
    .then(() => {
        console.log("Mongo Connection open!!");
    })
    .catch(err => {
        console.log("Mongo connection ERROR OCCURED");
        console.log(err);
    })

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(mongoSanitize());
app.use(express.urlencoded({ extended: true }))
app.use(methodoverride('_method'));
app.engine('ejs', ejsmate);
app.use(express.static('public'));

const secret = process.env.SECRET || 'mysecret';
const sessionConfig = {
    name: 'abc',
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    },
    store: new mongoDBStore({
        mongoUrl: dburl,
        touchAfter: 24 * 60 * 60
    })
}
app.use(session(sessionConfig))
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new passportlocal(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());
app.use((req, res, next) => {
    if (!['/login', '/'].includes(req.originalUrl)) {
        req.session.returnTo = req.originalUrl;
    }
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});
app.use('/', Userroute);
app.use('/campgrounds', Campgrounds);


const validateReview = (req, res, next) => {
    const reviewSchema = joi.object({
        review: joi.object({
            body: joi.string().required(),
            rating: joi.number().required()
        }).required()
    })
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const message = error.details.map(el => el.message).join(',')
        throw new expresserrors(message, 400);
    } else {
        next();
    }
}
const isauthor = async (req, res, next) => {
    const { id, reviewid } = req.params;
    const review = await Review.findById(reviewid);
    if (!review.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!!');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

app.get('/', (req, res) => {
    res.render('home');
})

app.post('/campgrounds/:id/reviews', isloggedin, validateReview, catchAsync(async (req, res) => {
    const campgrounds = await campground.findById(req.params.id);
    const review = new Review(req.body.review);
    review.author = req.user._id;
    campgrounds.reviews.push(review);
    await review.save();
    await campgrounds.save();
    req.flash('success', 'Successfully created a new Review');
    res.redirect(`/campgrounds/${campgrounds._id}`);
}));

app.delete('/campgrounds/:id/reviews/:reviewid', isloggedin, isauthor, catchAsync(async (req, res) => {
    await campground.findByIdAndUpdate(req.params.id, { $pull: { reviews: req.params.reviewid } });
    await Review.findByIdAndDelete(req.params.reviewid);
    req.flash('success', 'Successfully deleted review');
    res.redirect(`/campgrounds/${req.params.id}`);
}))

app.all('*', (req, res, next) => {
    next(new expresserrors('Page not found', 404));
})

app.use((err, req, res, next) => {
    const { statuscode = 500 } = err;
    if (!err.message) {
        err.message = 'Something went wrong';
    }
    res.status(statuscode).render('error', { err });
})

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`On port ${port}`);
}) 