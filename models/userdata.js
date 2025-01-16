const mongoose=require("mongoose");
const Schema = mongoose.Schema

const UserSchema = new Schema({
    bmi: Number,
    name : String,
    age : Number,
    weight : Number,
    height : Number,
    targetweight: Number,
    calorie_deficit: Number,
    intake_needed:Number,
    date: Date,
    steps: Number,
    kcal: Number,
    daily_burn:Number,
    // food_calorie:Number,
    total_food_calorie:Number,
    // refreshToken:String
})

const user = mongoose.model("user",UserSchema);

module.exports = user;