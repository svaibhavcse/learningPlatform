const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import the cors package
require('dotenv').config();
const nodemailer = require('nodemailer'); // Import nodemailer
const app = express();
 
// Middleware
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' }));
const PORT = process.env.PORT || 5000;

// MongoDB connection
const mongoURL = process.env.MONGO_URL;
mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// User model
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role:String
});

const User = mongoose.model('User', userSchema);

const LoginSchema = new mongoose.Schema({
  email: String,
  password: String,
  otp: Number 
});
const Login = mongoose.model('loginInfo', LoginSchema);
// Middleware
app.use(express.json());


// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'Gmail', // Update with your email service provider (e.g., Gmail)
  auth: {
    user: 'vaibhavs.20cse@kongu.edu', // Update with your email address
    pass: 'vfro zvnw aniz elzk' // Update with your email password
  }
});
// Route to handle user creation
app.post('/createUser', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if the user already exists
    const check = await User.findOne({ email });
    if (check) {
      return res.status(400).json({ error: 'User already exists!' });    
    }
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    
    // Create new user
    const user = new User({ name, email, role });
    await user.save();
    
    // Create login entry with OTP
    const login = new Login({ email, password, otp });
    await login.save();
    
    // Send email with OTP for password reset
    const mailOptions = {
      from: 'vaibhavs.20cse@kongu.edu', // Update with your email address
      to: email,
      subject: 'Reset Your Password',
      text: `Reset Your password with the OTP : ${login.otp}. Click on the following link to reset your password: http://localhost:3000/resetpassword/${email}`
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Failed to send OTP email' });
      }
      console.log('Email sent:', info.response);
      return res.status(200).json({ message: 'OTP sent successfully' });
    });

    // Send success response
    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(400).json({ error: 'Failed to create user.' });
  }
});

app.post('/login', async (req, res) => {
    try {
      const { email } = await req.body;
      const login = await Login.findOne({email} );
      if(login){
      const user = await User.findOne({email});
      role = user.role;     
      res.json({login,role})
      }
    } catch (error) {
      console.log(error);
    }
  });


  app.post('/resetPassword', async (req, res) => {
    try {
      const {  otp,email, newPassword } = req.body;
       // Log userID to check if it's received correctly
      // Find the user in the login_details collection
      const login = await Login.findOne({ email });
      if (!login) {
        
        return res.status(404).json({ error: 'User not found' });
      }
      // Check if the provided OTP matches the stored OTP
      const otp2=parseInt(otp,10)
      if (login.otp !== otp2) {
        return res.status(400).json({ error: 'Incorrect OTP' });
      }
  
      // Update the user's password with the new password
      login.password = newPassword;
      await login.save();
  
      res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/forgotpassword', async (req, res) => {
    try {
      const { email } = req.body;
      // Generate a new OTP
      
      const newOTP = Math.floor(100000 + Math.random() * 900000);
      // Update the OTP in the database
      await Login.updateOne({ email }, { otp: newOTP });
      // Fetch user details to get email address
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      // Send email with new OTP
      const mailOptions = {
        from: 'vaibhavs.20cse@kongu.edu',
        to: user.email,
        subject: 'Password Reset OTP',
        text: `Your OTP for password reset is: ${newOTP}. Click on the following link to reset your password: http://localhost:3000/forgetpassword/${email}`
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).json({ error: 'Failed to send OTP email' });
        }
        console.log('Email sent:', info.response);
        return res.status(200).json({ message: 'OTP sent successfully' });
      });
    } catch (error) {
      console.error('Error generating OTP:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));