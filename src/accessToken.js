const jwt = require("jsonwebtoken")

function generateAccessToken(user, expires) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: expires })
}

function validateToken(req, res, next) {
    const authHeader = req.headers["authorization"]
    const token = authHeader.split(" ")[1]
    if (token == null) res.sendStatus(400).send("Token not present")
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            res.status(403).send("Token invalid")
        }
        else {
            req.user = user
            next()
        }
    })
}

module.exports.generateAccessToken = generateAccessToken
module.exports.validateToken = validateToken