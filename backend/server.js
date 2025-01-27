const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const connectToDB = require('./db/connectDB');

const authRoute = require('./routes/authRoute')
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({origin:'http://localhost:5173', credentials: true}));

connectToDB();

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',authRoute);

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "../frontend/dist")));

	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "../frontend", "dist", "index.html"));
	});
}

app.listen(port,()=>console.log(`server is running on ${port}`))