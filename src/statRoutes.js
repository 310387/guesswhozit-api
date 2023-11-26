const accessToken = require("./accessToken")
const express = require("express")
const router = express.Router()

router.get("/stats", accessToken.validateToken, (req, res) => {
    console.log("Token is valid")
    console.log(req.user.email)
    res.send(`${req.user.email} successfully accessed post`)
})

module.exports = router