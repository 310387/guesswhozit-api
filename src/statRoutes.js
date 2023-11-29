const accessToken = require("./accessToken")
const express = require("express")
const router = express.Router()
const db = require("./connectToDB")
const mysql = require("mysql")

function getDBName(category) {
    let dbName = "stats_all";
    switch (category) {
        case "all":
            dbName = "stats_all"
            break;
        case "laLiga":
            dbName = "stats_la_liga"
            break;
        case "premierLeague":
            dbName = "stats_premier_league"
            break;
        case "bundesliga":
            dbName = "stats_bundesliga"
            break;
        case "ligue1":
            dbName = "stats_ligue_1"
            break;
        case "serieA":
            dbName = "stats_serie_a"
            break;
        case "superLig":
            dbName = "stats_super_lig"
            break;
        default:
            dbName = "stats_all"
    }
    return dbName;
}

router.get("/stats", accessToken.validateToken, (req, res) => {
    if (!("category" in req.query)) return res.sendStatus(500)
    const category = req.query.category
    const user_id = req.user.id
    const dbName = getDBName(category)
    db.getConnection(async (err, connection) => {
        if (err) return res.sendStatus(500)
        const sqlSearch = "SELECT * FROM ?? WHERE user_id = ?"
        const search_query = mysql.format(sqlSearch, [dbName, user_id])

        await connection.query(search_query, async (err, result) => {
            connection.release()
            if (err) return res.sendStatus(500)
            console.log("------> Stats Search Results")
            console.log(result.length)
            if (result.length != 0) {
                const playTime = result[0].play_time
                const guessCount = result[0].guess_count
                const winCount = result[0].win_count
                const currentStreak = result[0].current_streak
                const bestStreak = result[0].best_streak
                const gameCount = result[0].game_count
                res.json({ stats: { category, user_id, playTime, guessCount, winCount, currentStreak, bestStreak, gameCount } })
            }
            else {
                console.log("--------> No stats found")
                res.sendStatus(404)
            }
        })
    })
})

router.post("/stats", accessToken.validateToken, (req, res) => {
    if (!("category" in req.body && 'duration' in req.body && 'guessNum' in req.body && 'isWin' in req.body)) res.sendStatus(500)
    const category = req.body.category
    const user_id = req.user.id
    const duration = req.body.duration
    const guessNum = req.body.guessNum
    const isWin = req.body.isWin
    const dbName = getDBName(category)
    db.getConnection(async (err, connection) => {
        if (err) return res.sendStatus(500)
        const sqlSearch = "SELECT * FROM ?? WHERE user_id = ?"
        const search_query = mysql.format(sqlSearch, [dbName, user_id])
        const sqlInsert = "INSERT INTO ?? VALUES (0,?,?,?,1,?,?,?)"
        const insert_query = mysql.format(sqlInsert, [dbName, user_id, duration, guessNum, isWin ? 1 : 0, isWin ? 1 : 0, isWin ? 1 : 0])

        await connection.query(search_query, async (err, result) => {
            if (err) return res.sendStatus(500)
            console.log("------> Stats Search Results")
            console.log(result.length)
            if (result.length != 0) {
                const updated_playTime = result[0].play_time + duration
                const updated_guessCount = result[0].guess_count + guessNum
                const updated_winCount = isWin ? result[0].win_count + 1 : result[0].win_count
                const updated_currentStreak = isWin ? result[0].current_streak + 1 : 0
                const updated_bestStreak = updated_currentStreak > result[0].best_streak ? updated_currentStreak : result[0].best_streak
                const sqlUpdate = "UPDATE ?? SET play_time = ?, guess_count = ?, game_count = ?, win_count = ?, current_streak = ?, best_streak = ?"
                const update_query = mysql.format(sqlUpdate, [dbName, updated_playTime, updated_guessCount, result[0].game_count + 1, updated_winCount, updated_currentStreak, updated_bestStreak])
                await connection.query(update_query, (err, result) => {
                    connection.release()
                    if (err) return res.sendStatus(500)
                    console.log("--------> Updated stats record")
                    console.log(result.insertId)
                    res.send({ message: 'Stats updated' })
                })
            }
            else {
                await connection.query(insert_query, (err, result) => {
                    connection.release()
                    if (err) return res.sendStatus(500)
                    console.log("--------> Created new stats record")
                    console.log(result.insertId)
                    res.sendStatus(201)
                })
            }
        })
    })
})

router.get("/leaderboard", (req, res) => {
    if (!("category" in req.query) || !("type" in req.query)) return res.sendStatus(500)
    const category = req.query.category
    const type = req.query.type
    const dbName = getDBName(category)
    db.getConnection(async (err, connection) => {
        if (err) return res.sendStatus(500)
        let sqlSearch = ""
        let search_query = ""
        if (type === "win_rate") {
            sqlSearch = "SELECT users.username, (??.win_count/??.game_count)*100 as win_rate FROM ?? INNER JOIN users WHERE ??.user_id = users.id AND ??.game_count > 10 AND ??.win_count > 0 ORDER BY (??.win_count/??.game_count)*100 DESC LIMIT 5"
            search_query = mysql.format(sqlSearch, [dbName, dbName, dbName, dbName, dbName, dbName, dbName, dbName])
        } else {
            sqlSearch = "SELECT users.username, ??.?? FROM ?? INNER JOIN users WHERE ??.user_id = users.id AND ??.game_count > 10 ORDER BY ??.?? DESC LIMIT 5"
            search_query = mysql.format(sqlSearch, [dbName, type, dbName, dbName, dbName, dbName, type])
        }


        await connection.query(search_query, async (err, result) => {
            connection.release()
            if (err) return res.sendStatus(500)
            console.log("------> Leaderboard Results")
            console.log(result.length)
            if (result.length != 0) {
                res.json({ result })
            }
            else {
                console.log("--------> No Avaiable Result")
                res.sendStatus(404)
            }
        })
    })


})

module.exports = router