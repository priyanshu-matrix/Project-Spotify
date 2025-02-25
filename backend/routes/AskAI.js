const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const router = express.Router();
const fetchuser = require("../middleware/fetchuser");

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY
);
// Set the system instruction during model initialization

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `answer questions based on the given context`,
});

// Changed to POST since we're sending data in request body
router.post("/chat", fetchuser, async (req, res) => {
  try {
    const { prompt } = req.body;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    res.json({response : responseText });
  } catch (error) {
    console.error("Error:", error.message);
    res
      .status(500)
      .json({ error: "Input correct info or Internal server Error.." });
  }
});

module.exports = router;
