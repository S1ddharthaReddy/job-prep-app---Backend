require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectToDB = require("./src/config/database");

connectToDB();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: "https://job-prep-app-frontend.vercel.app/",
    credentials: true
}));

const authRouter = require("./src/routes/auth.routes");
const interviewRouter = require("./src/routes/interview.routes");

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

module.exports = app;