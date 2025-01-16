const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose');
const user = require("./models/userdata.js");
const FitnessData = require('./models/burnt.js');
const fs = require('fs');

const MONGO_URL = "mongodb://127.0.0.1:27017/nutritionist";
// const MONGO_URL = "mongodb+srv://rathodvrutik123:fqV095o3582dNll4@cluster0.qh5zu.mongodb.net/";

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

const app = express();

// Setting up the secret key for session management
app.use(session({
  secret: SESSION_KEY,
  resave: false,
  saveUninitialized: true
}));

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.engine("ejs",ejsMate);

// Body parser middleware to handle form submissions
app.use(bodyParser.urlencoded({ extended: true }));

// Index Page (form submission page)
app.get('/', async (req, res) => {
  let userr = new user({

  })
  await userr.save();
  res.render('index',{userr});
});

// Result Page (handle POST request)
app.post('/result/:id',async (req, res) => {
  const {id} = req.params;
  console.log(id);
  const userr = await user.findById(id);
  const name = req.body.name;
  const age = parseInt(req.body.age);
  const heightCm = parseFloat(req.body.height);
  const weight = parseFloat(req.body.weight);
  

  // Convert height from cm to meters and calculate BMI
  const heightM = heightCm / 100;
  const bmi = parseFloat((weight / (heightM ** 2)).toFixed(2));

  //Posting to Database

  // let userr = new user({
  //   bmi: bmi,
  //   name: name,
  //   age: age,
  //   height: heightCm,
  //   weight:weight,
  // })

  // await userr.save();

  userr.name = name;
  userr.age = age;
  userr.bmi = bmi;
  userr.height = heightCm;
  userr.weight = weight;

  await userr.save();


  // Determine BMI category and intro
  let category = '';
  let intro = '';
  if (bmi < 18.5) {
    category = 'Underweight';
    intro = "You are underweight. It's important to focus on healthy weight gain.";
  } else if (bmi >= 18.5 && bmi < 24.9) {
    category = 'Normal weight'; 
    intro = "You have a normal weight. Maintain a balanced diet to stay healthy.";
  } else if (bmi >= 25 && bmi < 29.9) {
    category = 'Overweight';
    intro = "You are overweight. Focus on a healthy lifestyle and proper diet.";
  } else {
    category = 'Obesity';
    intro = "You are in the obese range. It's important to seek advice from a health professional.";     
  }
  what_to_eat = [
        "Eat more protein-rich foods like eggs, nuts, and chicken.",
        "Include leafy greens and vegetables in your diet.",
        "Drink plenty of water to stay hydrated.",
        "Consume healthy fats like avocado and olive oil."
    ]
    what_to_avoid = [
        "Avoid sugary drinks and processed foods.",
        "Limit your intake of fast food and fried items.",
        "Cut back on refined carbohydrates like white bread.",
        "Avoid excessive salt and sugary snacks."]
    const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const recommendation = getRandomItem(what_to_eat);
    const avoid = getRandomItem(what_to_avoid);

    const allusers = await user.find({});

  // Pass data to the result view
  res.render('result', { name, age, bmi, category, intro , recommendation , avoid ,allusers , userr});
});

// Route to handle GET and POST requests for diet recommendation
app.all('/diet_recommendation', (req, res) => {
  if (req.method === 'POST') {
    const diet = req.body.diet;
    let suggestion = '';

    // Determine diet suggestion based on user selection
    if (diet === 'weight_loss') {
      suggestion = "A low-calorie diet focusing on vegetables, lean protein, and whole grains.";
    } else if (diet === 'weight_gain') {
      suggestion = "A high-calorie diet including healthy fats, protein-rich foods, and dairy.";
    } else if (diet === 'balanced') {
      suggestion = "A balanced diet with an even distribution of carbs, fats, and proteins.";
    }

    // Render the template with the suggestion and session data
    return res.render('diet_recommendation', {
      bmi: req.session.bmi,
      name: req.session.name,
      suggestion: suggestion
    });
  }

  // Handle the GET request and pre-select the diet recommendation based on BMI
  const bmi = req.session.bmi;
  const name = req.session.name;
  let recommendation = null;

  if (bmi) {
    if (bmi < 18.5) {
      recommendation = 'weight_gain';
    } else if (bmi >= 18.5 && bmi <= 24.9) {
      recommendation = 'balanced';
    } else {
      recommendation = 'weight_loss';
    }
  }

  // Render the template with the pre-selected recommendation
  res.render('diet_recommendation', {
    bmi: bmi,
    name: name,
    recommendation: recommendation,
  });
});

app.get('/result/:id/burnt',async (req,res) => 
{
  const {id} = req.params;
  const userr = await user.findById(id);

  res.render('details',{userr});
})

const MET_VALUES = {
  running: 11.5,
  cycling: 8.5,
  swimming: 7.0
};

app.post('/calculate', (req, res) => {
  const { steps, weight, activity_type, activity_duration } = req.body;

  // Convert input values to numbers
  const stepsNum = parseFloat(steps);
  const weightNum = parseFloat(weight);
  const duration = parseFloat(activity_duration) / 60; // Convert minutes to hours

  // Steps to calories conversion
  const caloriesFromSteps = (stepsNum / 20) * (weightNum / 1000);

  // Calculate activity-based calories burned using MET
  const activityCalories = MET_VALUES[activity_type] * weightNum * duration;

  // Total calories burned
  const totalCaloriesBurned = Math.round(caloriesFromSteps + activityCalories);

  // Send the results to the result page
  res.render('burnt_result', { totalCaloriesBurned });
});

app.get('/needed', (req, res) => {
  res.render('needed');
});

app.post('/calculate_needed', (req, res) => {
  const { age, gender, weight, height, activity } = req.body;

  // Convert form inputs to numbers
  const ageNum = parseFloat(age);
  const weightNum = parseFloat(weight);
  const heightNum = parseFloat(height);

  // Calculate BMR using the Mifflin-St Jeor equation
  let bmr;
  if (gender === 'male') {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
  } else if (gender === 'female') {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161;
  }

  // Multiply BMR by activity factor
  let activityMultiplier = 1.2; // default for sedentary
  if (activity === 'light') activityMultiplier = 1.375;
  if (activity === 'moderate') activityMultiplier = 1.55;
  if (activity === 'active') activityMultiplier = 1.725;
  if (activity === 'very_active') activityMultiplier = 1.9;

  const dailyCalories = Math.round(bmr * activityMultiplier);

  // Render result page
  res.render('needed_result', { bmr: Math.round(bmr), dailyCalories });
});

const CALORIES_PER_KG = 7700;  // Approx. calories to lose 1kg of body fat

app.get('/result/:id/goal', async (req, res) => {
  let {id} = req.params;
  const userr = await user.findById(id); // Its important to put await to see the output
  console.log(userr.weight);
  res.render('goal',{userr});
});

// Route to handle goal setting and calculate daily calorie deficit
app.post('/result/:id/set-goal', async(req, res) => {
  let {id} = req.params;
  const userr = await user.findById(id);
  const { current_weight, target_weight, duration_type, duration } = req.body;
  const currentWeight = parseFloat(current_weight);
  const targetWeight = parseFloat(target_weight);
  const durationInDays = duration_type === 'days' ? parseInt(duration) : parseInt(duration) * 30;

  // Calculate weight to lose
  const weightToLose = currentWeight - targetWeight;

  if (weightToLose <= 0) {
      return res.send('Error: Target weight should be less than current weight!');
  }

  // Calculate total calorie deficit needed to lose the target weight
  const totalCalorieDeficit = weightToLose * CALORIES_PER_KG;

  // Calculate daily calorie deficit required
  const dailyCalorieDeficit = totalCalorieDeficit / durationInDays;

  // Calculate target daily calories to eat for weight loss (assuming normal BMR of 2000 calories/day)
  const targetDailyCalories = 2000 - dailyCalorieDeficit;

  req.session.targetDailyCalories= Math.round(targetDailyCalories);

  userr.targetweight = targetWeight;
  userr.calorie_deficit = dailyCalorieDeficit;
  userr.intake_needed = targetDailyCalories;
  const daily_calorie_burn = targetDailyCalories + dailyCalorieDeficit;
  userr.daily_burn = daily_calorie_burn;  
  await userr.save();
  console.log(userr.targetweight);
  // let targetweight = new user({
  //   targetweight: targetWeight,
  // });

  // await targetweight.save();
  // console.log("weight saved");

  // await targetweight.save();
  // console.log('weight saved');

  // Render the result to the user
  res.render('goal_result', {
      currentWeight,
      targetWeight,
      durationInDays,
      dailyCalorieDeficit: Math.round(dailyCalorieDeficit),
      targetDailyCalories: Math.round(targetDailyCalories),
      daily_calorie_burn : daily_calorie_burn
  });
});

// app.get('/result/:id/intake', async (req, res) => {
//   let {id} = req.params;
//   const userr = await user.findById(id);
//   res.render('intake',{userr});
// });


// Route to log and calculate daily calorie intake
app.post('/result/:id/log-calories', async (req, res) => {
  let {id} = req.params;
  const userr = await user.findById(id);
  const breakfastCalories = parseInt(req.body.breakfast_calories);
  const lunchCalories = parseInt(req.body.lunch_calories);
  const snacksCalories = parseInt(req.body.snacks_calories);
  const dinnerCalories = parseInt(req.body.dinner_calories);
  const intakeneeded = userr.intake_needed;

  const totalCalories = breakfastCalories + lunchCalories + snacksCalories + dinnerCalories;

  // Store the meal data in the session (you can replace this with a database later)
  req.session.meals = {
      breakfast: breakfastCalories,
      lunch: lunchCalories,
      snacks: snacksCalories,
      dinner: dinnerCalories,
      total: totalCalories,
      intakeneeded : intakeneeded
  };

  console.log(totalCalories);
  console.log(userr.intake_needed);
 

  const query = encodeURIComponent(JSON.stringify(userr));

  res.redirect(`/intake_summary?data=${query}`);
});

// Route to display the daily calorie summary
app.get('/intake_summary', (req, res) => {  
  const meals = req.session.meals || {
      breakfast: 0,
      lunch: 0,
      snacks: 0,
      dinner: 0,
      total: 0
  };

  res.render('intake_summary', { meals });
});

app.get('/fitness-data',async(req,res) =>
{
  try{
    const data = await FitnessData.find();
    res.json(data);
  }
  catch(error)
  {
    console.error('Error retrieving fitness data:',error)
    res.status(500).json({error:'Failed to retrieve data'});
  }
});











//Smart Watch Integration

const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
// const fitnessData = require('./models/burnt.js');
const port = 3000;
const cors = require('cors');
// const FitnessData = require('./models/burnt.js');
app.use(cors());

// const MONGO_URL = "mongodb://127.0.0.1:27017/nutritionist";

// main().then(() => 
// {
//   console.log("connection successful");
// }).catch((err) =>
// {
//   console.log(err);
// })

// async function main() {
//   await mongoose.connect(MONGO_URL);
// }

// Replace with your own Client ID and Secret
require('dotenv').config();
const oauth2Client = new OAuth2( 
  GOOGLE_KEY,
  GOOGLE_PASS,
  'http://localhost:3000/oauth2callback'
);

// Scope for requesting step count data
const scopes = ['https://www.googleapis.com/auth/fitness.activity.read'];
app.use(bodyParser.urlencoded({ extended: true }));

// Step 1: Auth URL
app.get('/result/:id/burnt/auth', (req, res) => {
  const {id} = req.params;
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    // redirect_uri: 'http://localhost:3000/oauth2callback', // One registered redirect URI
    // state: JSON.stringify({ targetUrl: `/${id}` })
    state: JSON.stringify({ userId: id })
  });
  res.redirect(url);
  console.log(url);
});

// Step 2: OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  // const {id} = req.params;
  // console.log(id);
  const { code, state } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  console.log("Tokens: ",tokens);
  oauth2Client.setCredentials(tokens);

  // Parse the state parameter to get the user ID
  const { userId } = JSON.parse(state);
  console.log("UserID ",userId);

  const User = await user.findById(userId);
  console.log(User);

  // Store the refresh token for later use
// const refreshToken = tokens.refresh_token;
// User.refreshToken = refreshToken; // Save this to your User model
// await User.save();

  console.log(oauth2Client);

  // Store the refresh token for later use
  // const refreshToken = tokens.refresh_token;

  // Use the access token to make API calls
  const accessToken = tokens.access_token;

  // When the access token expires, use the refresh token to obtain a new access token
  // async function refreshAccessToken() {
  //   try {
  //     const { credentials } = await oauth2Client.refreshAccessToken();
  //     oauth2Client.setCredentials(credentials);
  //     return credentials.access_token;
  //   } catch (error) {
  //     console.error('Error refreshing access token:', error);
  //   }
  // }

  // Call the function to refresh the token
  // const newAccessToken = await refreshAccessToken();

  // Step 3: Fetch data from Google Fit API
  const fitness = google.fitness('v1');
  const now= Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  // const accessToken = oauth2Client.credentials.access_token;
  const result =await fitness.users.dataset.aggregate({
    userId: 'me',
    requestBody: {
      aggregateBy: [{
        dataTypeName: 'com.google.step_count.delta',
        dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
      },
      {
        dataTypeName: 'com.google.calories.expended',
        dataSourceId: 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended',
      }
      // {
      //   dataTypeName: 'com.google.heart_rate.bpm',
      //   dataSourceId: 'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm',
      // },
      // {
      //   dataTypeName: 'com.google.distance.delta',
      //   dataSourceId: 'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta',
      // }
    ],
      bucketByTime: { durationMillis: 86400000 }, // Group by day
      // startTimeMillis: Date.now() - 7 * 86400000, // Last 7 days
      startTimeMillis: startOfToday.getTime(), // Last 7 days
      endTimeMillis: now,
    },
    headers: {
      Authorization: `Bearer ${accessToken}` // Include the access token
    }
  });

  // Log the entire API response to debug
console.log(JSON.stringify(result.data, null, 2));

  // Example: Extract total step count from the API response
  const stepsData = result.data.bucket.map(day => {
    const steps = day.dataset[0].point.reduce((total, point) => total + point.value[0].intVal, 0);
    const kcal = day.dataset[1] ? day.dataset[1].point.reduce((total, point) => total + point.value[0].fpVal, 0) : 0;
    // const heartRate = day.dataset[2] ? day.dataset[2].point.reduce((total, point) => total + point.value[0].intVal, 0) : 0;
  // const distance = day.dataset[3] ? day.dataset[3].point.reduce((total, point) => total + point.value[0].fpVal, 0) : 0;
    return { date: new Date(parseInt(day.startTimeMillis)), steps , kcal};
  });
  stepsData.forEach( async (day) => {
    console.log(`Date: ${day.date}`);
    console.log(`Steps: ${day.steps}`);
    console.log(`Calories: ${day.kcal}`);
    User.steps = day.steps;
    User.kcal = day.kcal;
    await User.save();
  });

  // await User.insertMany(stepsData); 
  // Send extracted step count data as JSON
  res.render('details' , {User});   //main
  // return result.data;
  // Send response


// to download json file


  // const jsonData = JSON.stringify(result.data, null, 2);

  // const filePath = path.join(__dirname, 'data.json');

  // fs.writeFile(filePath, jsonData, (err) => {
  //   if (err) {
  //       return res.status(500).send('Error writing file');
  //   }

  //   res.download(filePath, 'data.json', (err) => {
  //     if (err) {
  //         console.error('Error downloading file:', err);
  //     }
    

  // res.download('C:\\Users\\HP\\Desktop\\Project_main',result.data);
});
// });
// });





// Food Intake *----------------------------------------------------

const axios = require('axios');

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Nutritionix API credentials
const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
const NUTRITIONIX_API_KEY = process.env.NUTRITIONIX_API_KEY;

// Routes
app.get('/result/:id/intake', async (req, res) => {
  let {id} = req.params;
  const userr = await user.findById(id);
  res.render('food_intake',{userr});
    // res.render('index'); // Render the homepage
});

app.post('/result/:id/intake/search', async (req, res) => {
    const {id} = req.params;
    const userr = await user.findById(id);
    const query = req.body.foodName;
    console.log(query);
    try {
        const response = await axios.post(
            `https://trackapi.nutritionix.com/v2/natural/nutrients`,
            {
                query: query,
            },
            {
                headers: {
                    'x-app-id': NUTRITIONIX_APP_ID,
                    'x-app-key': NUTRITIONIX_API_KEY,
                },
            }
        );

        const foodData = response.data.foods[0]; // Get the first food item
        console.log(foodData);

        const newCalories = foodData.nf_calories;
        userr.total_food_calorie = (userr.total_food_calorie || 0) + newCalories;
        await userr.save();
        res.render('food_intake_summary', { food: foodData , userr:userr});
        if(userr.total_food_calorie>=userr.intake_needed)
        {
          res.send("Your calories limit exceeded!");
        }
    } catch (error) {
        console.error('Error fetching food data:', error);
        res.render('food_intake_summary', { food: null, error: 'Food not found or error fetching data.' });
    }
});


// Start the serverA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});