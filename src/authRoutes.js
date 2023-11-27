const db = require("./connectToDB")
const bcrypt = require("bcrypt")
const express = require("express")
const router = express.Router()
const mysql = require("mysql")
const accessToken = require("./accessToken")
const transporter = require("./email")

router.post("/register", async (req, res) => {
    const email = req.body.email;
    const username = req.body.name;
    const salt = await bcrypt.genSalt()
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    db.getConnection(async (err, connection) => {
        if (err) throw (err)
        const sqlSearch = "SELECT * FROM users WHERE email = ? or username = ?"
        const search_query = mysql.format(sqlSearch, [email, username])
        const sqlInsert = "INSERT INTO users VALUES (0,?,?,?,?)"
        const insert_query = mysql.format(sqlInsert, [username, email, hashedPassword, new Date()])

        await connection.query(search_query, async (err, result) => {
            if (err) throw (err)
            console.log("------> Search Results")
            console.log(result.length)
            if (result.length != 0) {
                const emailExist = result.some(record => record.email === email)
                const userNameExist = result.some(record => record.username === username)
                connection.release()
                let errMessage = ""
                if (emailExist) {
                    console.log("------> Email already exists")
                    errMessage += "Email"
                }
                if (userNameExist) {
                    console.log("------> Username already exists")
                    errMessage += errMessage ? ", Username" : "Username"
                }
                errMessage += " already exists."
                res.status(409).send({ message: errMessage })
            }
            else {
                await connection.query(insert_query, (err, result) => {
                    connection.release()
                    if (err) throw (err)
                    console.log("--------> Created new User")
                    console.log(result.insertId)
                    res.sendStatus(201)
                })
            }
        })
    })
})

router.post("/login", (req, res) => {
    const email = req.body.email
    const password = req.body.password
    db.getConnection(async (err, connection) => {
        if (err) throw (err)
        const sqlSearch = "Select * from users where email = ?"
        const search_query = mysql.format(sqlSearch, [email])
        await connection.query(search_query, async (err, result) => {
            connection.release()

            if (err) throw (err)
            if (result.length == 0) {
                console.log("--------> User does not exist")
                res.status(404).send({ message: "User not found." })
            }
            else {
                const hashedPassword = result[0].password

                if (await bcrypt.compare(password, hashedPassword)) {
                    console.log("---------> Login Successful")
                    console.log("---------> Generating accessToken")
                    const token = accessToken.generateAccessToken({ email, id: result[0].id }, "7d")
                    console.log(token)
                    res.json({ user: { name: result[0].username, email: result[0].email }, accessToken: token })
                }
                else {
                    console.log("---------> Password Incorrect")
                    res.status(401).send({ message: "Password Incorrect." })
                }
            }
        })
    })
})

router.post("/forgot-password", async (req, res) => {
    const email = req.body.email
    db.getConnection(async (err, connection) => {
        if (err) throw (err)
        const sqlSearch = "Select * from users where email = ?"
        const search_query = mysql.format(sqlSearch, [email])
        await connection.query(search_query, async (err, result) => {
            connection.release()

            if (err) throw (err)
            if (result.length == 0) {
                console.log("--------> User does not exist")
                res.status(404).send({ message: "User not found." })
            }
            else {
                const token = accessToken.generateAccessToken({ email, id: result[0].id }, "1h")
                const resetLink = `${process.env.CLIENT_URL}/password-reset/${token}?email=${email}`
                try {
                    const info = await transporter.sendForgotPasswordEmail(email, result[0].username, resetLink)
                    console.log("--------> Email sent")
                    res.send({ message: "Email sent." })
                } catch (error) {
                    console.log("--------> Error sending email:", error)
                    res.status(500).send({ message: "Error occured, please try again later." })
                }
            }
        })
    })
})

router.post("/reset-password", accessToken.validateToken, async (req, res) => {
    const email = req.body.email
    const password = req.body.password
    if (email != req.user.email) {
        console.log("--------> Email and token not matched")
        res.status(403).send({ message: "User Not Found." })
    } else {
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const salt = await bcrypt.genSalt()
            const hashedPassword = await bcrypt.hash(password, salt);
            const sqlUpdate = "UPDATE users SET password = ? WHERE email = ?"
            const update_query = mysql.format(sqlUpdate, [hashedPassword, email])

            await connection.query(update_query, async (err, result) => {
                if (err) throw (err)
                console.log("------> Record Updated")
                connection.release()
                res.send({ message: "Password Updated" })
            })
        })
    }
})

module.exports = router