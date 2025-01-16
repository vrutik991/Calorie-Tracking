const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const foodSchema = new mongoose.Schema({
    Food:
    {
        type:String,
        required:true,
    },
    description: String,
    calories: 
    {
        type:Number,
    },
    Protein: Number,
    Fat:Number,
    Carbohydrates:Number,
    Fiber:Number,
    Sugars:Number,
    Calcium:Number,
    Iron:Number,
    Vitamin_C:Number,
});

const FoodData = mongoose.model("FoodData",foodSchema);

module.exports= FoodData;