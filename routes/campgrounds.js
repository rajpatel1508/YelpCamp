const express = require('express');
const router = express.Router();
const expresserrors = require('../utils/expresserrors');
const catchAsync = require('../utils/catchAsync');
const campground = require('../models/campground');
const { isloggedin } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const BaseJoi = require('joi');
const sanitizeHtml = require('sanitize-html');

const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML!'
    },
    rules: {
        escapeHTML: {
            validate(value, helpers) {
                const clean = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                });
                if (clean !== value) return helpers.error('string.escapeHTML', { value })
                return clean;
            }
        }
    }
});

const joi = BaseJoi.extend(extension)
const validate = (req, res, next) => {
    const campgroundSchema = joi.object({
        title: joi.string().required().escapeHTML(),
        price: joi.number().required().min(0),
        location: joi.string().required().escapeHTML(),
        description: joi.string().required().escapeHTML()
    })
    const reviewSchema = joi.object({
        review: joi.object({
            body: joi.string().required().escapeHTML(),
            rating: joi.number().required()
        })
    })
    const { error } = campgroundSchema.validate(req.body);
    if (error) {
        const message = error.details.map(el => el.message).join(',')
        throw new expresserrors(message, 400);
    } else {
        next();
    }
}

const isauthor = async (req, res, next) => {
    const { id } = req.params;
    const camp = await campground.findById(id);
    if (!camp.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!!');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

router.get('/', catchAsync(async (req, res) => {
    const campgrounds = await campground.find({});
    res.render('campgrounds/index', { campgrounds });
}));

router.get('/new', isloggedin, (req, res) => {
    res.render('campgrounds/new');
});

router.get('/:id', catchAsync(async (req, res) => {
    const campgrounds = await campground.findById(req.params.id).populate({ path: 'reviews', populate: { path: 'author' } }).populate('author');
    if (!campgrounds) {
        req.flash('error', 'Cannot find the campground');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/show', { campgrounds });
}));

router.post('/', isloggedin, upload.single('image'), validate, catchAsync(async (req, res) => {
    const newcampground = new campground(req.body);
    newcampground.image = { url: req.file.path, filename: req.file.filename };
    newcampground.author = req.user._id;
    await newcampground.save();
    req.flash('success', 'Successfully added a new campground');
    res.redirect(`/campgrounds/${newcampground._id}`);
}));

router.get('/:id/edit', isloggedin, isauthor, catchAsync(async (req, res) => {
    const campgrounds = await campground.findById(req.params.id);
    res.render('campgrounds/edit', { campgrounds });
}));

router.put('/:id', isloggedin, isauthor, upload.single('image'), validate, catchAsync(async (req, res) => {
    console.log(req.body);
    const campgrounds = await campground.findByIdAndUpdate(req.params.id, req.body);
    console.log(campgrounds);
    campgrounds.image = { url: req.file.path, filename: req.file.filename };
    await campgrounds.save();
    req.flash('success', 'Successfully updated campground');
    res.redirect(`/campgrounds/${campgrounds._id}`);
}));

router.delete('/:id', isloggedin, isauthor, catchAsync(async (req, res) => {
    await campground.findByIdAndDelete(req.params.id);
    req.flash('success', 'Successfully deleted campground');
    res.redirect('/campgrounds');
}));



module.exports = router;