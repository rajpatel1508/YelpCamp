const mongoose = require('mongoose');
const campground = require('../models/campground');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');

mongoose.connect('mongodb://localhost:27017/yelp-camp')
    .then(() => {
        console.log("Mongo Connection open!!");
    })
    .catch(err => {
        console.log("Mongo connection ERROR OCCURED");
        console.log(err);
    });

const sample = array => array[Math.floor(Math.random() * array.length)];

const seedDB = async () => {
    await campground.deleteMany({});
    for (let i = 0; i < 50; i++) {
        const random1000 = Math.floor(Math.random() * 1000);
        const price = Math.floor(Math.random() * 30) + 10;
        const camp = new campground({
            author: '62beb92f33c5c52798b2fdb0',
            location: `${cities[random1000].city}, ${cities[random1000].state}`,
            title: `${sample(descriptors)} ${sample(places)}`,
            price: `${price}`,
            image: {
                url: "https://res.cloudinary.com/dfhqsss0e/image/upload/v1657011039/YelpCamp/kgz8e9t7zvole2ybdksz.jpg",
                filename: "YelpCamp/kgz8e9t7zvole2ybdksz"
            },
            description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Aliquid iste, eius perspiciatis molestiae fugiat reprehenderit explicabo repudiandae voluptatum inventore autem, laboriosam tenetur debitis, deleniti tempore saepe. Voluptatem quos nam ab?'
        })
        await camp.save();
    }
}

seedDB().then(() => {
    mongoose.connection.close();
})