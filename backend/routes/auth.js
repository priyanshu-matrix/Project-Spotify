const express = require("express");
const User = require("../models/User");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
const fetchuser = require("../middleware/fetchuser");
const nodemailer = require("nodemailer");

//JWT_SECRET encode it in .env file
const JWT_SECRET = 'shhhhh';

const router = express.Router();

//Route-1 :Create a new user using: POST "/api/auth/". No login required
router.post(
  "/signup",
  [
    body("name", "Enter a valid name").isLength({ min: 3 }),
    body("email", "Enter a valid email").isEmail(),
    body("password", "Make a strong password of atleast 5 characters").isLength(
      { min: 5 }
    ),
  ],
  async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      success = false;
      return res.status(400).json({ errors: errors.array() });
    }

    //Check whether the user with this email exists already
    try {
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        success = false;
        return res
          .status(400)
          .json({ error: "Sorry a user with this email already exists" });
      }
      const salt = await bcrypt.genSalt(10);
      secPass = await bcrypt.hash(req.body.password, salt);
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: secPass,
      });

      const data = {
        user: {
          id: user.id,
        },
      };
      const authToken = jwt.sign(data, JWT_SECRET);
      success = true;
      res.json({success, authToken });
      // console.log('User Created');
      // console.log(user.name,'signed up',user.email);
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Some error occured");
    }
  }
);

//Route-2 :Authenticate a user using: POST "/api/auth/login". No login required
router.post(
  "/login",
  [
    body("email", "Enter a valid email").isEmail(),
    body("password", "Password cannot be blank").exists(),
  ],
  async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      success = false;
      return res.status(400).json({ success, errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (!user) {
        success = false;
        return res
          .status(400)
          .json({ success, error: "Please try to login with correct credentials" });
      }
      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        success = false;
        return res
          .status(400)
          .json({ success, error: "Please try to login with correct credentials" });
      }
      const data = {
        user: {
          id: user.id,
        },
      };
      success = true;
      const authToken = jwt.sign(data, JWT_SECRET);
      res.json({ success, authToken });

      console.log('Login Success');
      console.log(user.name, 'logined!!', user.email);
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Some error occured");
    }
  }
);

//Route-3 :Get loggedin user details using: POST "/api/auth/getuser". No login required
router.post("/getuser", fetchuser, async (req, res) => {
  try {
    userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);
    console.log('User Details fetched');
    console.log(user.name,'details fetched!!',user.email);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Some error occured");
  }
});

// Route-4: Send OTP to email for password reset: POST "/api/auth/forgot-password"
router.post("/forgot-password", [body("email", "Enter a valid email").isEmail()], async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        success = false;
        return res.status(400).json({ success, errors: errors.array() });
    }

    const { email } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            success = false;
            return res.status(400).json({ success, error: "No user found with this email" });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Save OTP to user document (consider adding an expiry)
        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = Date.now() + 3600000; // OTP expires in 1 hour
        await user.save();

        // Send OTP to user's email (replace with your email sending logic)
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'priyanshupandey44448@gmail.com',
            pass: 'lkavbqpdppgzxgjh'
          }
        });

        const mailOptions = {
          from: 'priyanshupandey44448@gmail.com',
          to: email,
          subject: 'Password Reset OTP',
          text: `Your OTP for password reset is: ${otp}`
        };

        transporter.sendMail(mailOptions, function(error, info){
          if (error) {
            console.log(error);
            success = false;
            return res.status(500).json({ success, error: "Failed to send OTP" });
          } else {
            console.log('Email sent: ' + info.response);
            success = true;
            return res.json({ success, message: "OTP sent to your email" });
          }
        });


    } catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occurred");
    }
});

// Route-5: Reset password after OTP verification: POST "/api/auth/reset-password"
router.post("/reset-password", async (req, res) => {
    let success = false;
    const { email, otp, newPassword } = req.body;

    try {
        let user = await User.findOne({
            email,
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            success = false;
            return res.status(400).json({ success, error: "Invalid OTP or OTP has expired" });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(newPassword, salt);

        // Update user's password and clear OTP fields
        user.password = secPass;
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        success = true;
        res.json({ success, message: "Password reset successfully" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occurred");
    }
});

//Route-6 :Delete an existing user using: DELETE "/api/auth/deleteuser". Login required
router.delete("/deleteuser/:id", fetchuser, async (req, res) => {
    try {
        // Find the user to be delete and delete it
        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send("Not Found");
        }

        // Allow deletion only if user owns this account
        if (user.id !== req.user.id) {
            return res.status(401).send("Not Allowed");
        }

        user = await User.findByIdAndDelete(req.params.id);
        res.json({ Success: "User has been deleted", user: user });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }
});

module.exports = router;
