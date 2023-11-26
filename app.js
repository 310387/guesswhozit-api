const express = require("express")
const app = express()
const bodyParser = require('body-parser');

require("dotenv").config()
const authRoutes = require("./src/authRoutes")
const statRoutes = require("./src/statRoutes")
const cors = require('cors')
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json())
app.use('/', authRoutes)
app.use('/', statRoutes)

const port = process.env.PORT
app.listen(port,
    () => console.log(`Server Started on port ${port}...`))