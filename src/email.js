const nodemailer = require("nodemailer");
const handlebars = require("handlebars")
const fs = require("fs")
const path = require("path")
const passwordResetTemplateSource = fs.readFileSync(path.join(__dirname, "../templates", "/passwordReset.hbs"), "utf8")
const passwordResetTemplate = handlebars.compile(passwordResetTemplateSource)

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    },
});

function sendForgotPasswordEmail(email, name, resetLink) {
    const htmlToSend = passwordResetTemplate({ name, resetLink })
    const data = {
        from: 'no-reply@guesswhozit.com',
        to: email,
        subject: 'Reset Password Notification',
        html: htmlToSend
    }
    return transporter.sendMail(data)
}

module.exports.sendForgotPasswordEmail = sendForgotPasswordEmail