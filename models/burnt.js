const mongoose=require("mongoose");
const Schema = mongoose.Schema

const fitnessSchema = new Schema({
    date: Date,
    steps: Number,
    kcal: Number,
})

const FitnessData = mongoose.model("FitnessData", fitnessSchema);

module.exports = FitnessData;