const connectDB = require("./DB");
const express = require("express");
var cors = require("cors");
require("dotenv").config();

connectDB();
const app = express();
const port = process.env.PORT || 9000;

app.use(cors());
app.use(express.json());


// //Avilable Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/AI", require("./routes/AskAI"));

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
