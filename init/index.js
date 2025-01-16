const mongoose = require("mongoose");
const initData = require("./foods.js");
const FoodData = require("../models/food.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/nutritionist";

main().then(() => 
{
    console.log("connection successful");
}).catch((err) =>  
{
    console.log(err);
});

async function main()
{
    await mongoose.connect(MONGO_URL);
}

const initDB = async () =>
{
    console.log("reached");
    await FoodData.deleteMany({});
    await FoodData.insertMany(initData.data);
    await FoodData.insertMany(initData.data);
    console.log("data was initialized");
};

initDB();