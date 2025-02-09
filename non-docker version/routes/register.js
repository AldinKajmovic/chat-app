var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const pg = require('pg');
const { v4: uuidv4 } = require('uuid');


const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};
require('dotenv').config();
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


router.get('/', function(req, res, next) {
    res.render('register');
});

router.post('/', async function(req, res, next) {
    const hashedPassword = await encryptPassword(req.body.password);
    const name = req.body.name;
    const last_name = req.body.lastname;
    const username = req.body.username;
    const id = uuidv4();

    const client = await pool.connect();
    try {
        const userQuery = await client.query('INSERT INTO users(user_id, name,last_name,username,password) values($1,$2,$3,$4,$5);', [id, name,last_name, username, hashedPassword]);
        const statusQuery = await client.query('INSERT INTO status(user_id, online) VALUES($1, $2);', [id, 0]);

        return res.redirect('/login');

    } catch (err) {
        console.error(err);
        return res.status(500).send(err);
    } finally {
        client.release();
    }

});

module.exports = router;