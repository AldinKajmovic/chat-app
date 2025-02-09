var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const pg = require('pg');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};
let pool = new pg.Pool(config);

const encryptPassword = async (plainPassword) => {
    return new Promise((resolve, reject) => {

        bcrypt.genSalt(saltRounds, function(err, salt) {
            if (err) reject(err);
            bcrypt.hash(plainPassword, salt, function(err, hash) {
                if (err) {
                    reject(err);
                } else {
                    resolve(hash);
                }
            });
        });

    });

};


router.get('/', function (req, res, next) {
    res.render('login');
});

router.post("/", async function (req, res, next) {
    const client = await pool.connect();
    try {
        const userQuery = await client.query('SELECT * FROM users WHERE username = $1;', [req.body.username]);

        if (userQuery.rows.length === 0) {
            return res.render('login');
        }
        bcrypt.compare(req.body.password, userQuery.rows[0].password, async function (err, resCompare) {
            if (resCompare) {
                const userData = {
                    id: userQuery.rows[0].user_id,
                    username: userQuery.rows[0].username
                };

                req.session.userData = userData;
                const statusQuery = await client.query('UPDATE status SET online = 1 WHERE user_id = $1;', [userData.id]);
                res.redirect('/chat/homepage');
            } else {
                return res.render('login');
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).send(err);
    } finally {
        client.release();
    }
});


module.exports = router;
