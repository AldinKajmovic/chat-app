const express = require('express');
const router = express.Router();
const pg = require('pg');
const axios = require('axios');
require('dotenv').config();
const {v4: uuidv4} = require('uuid');

const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};
let pool = new pg.Pool(config);


router.post('/', function (req, res, next) {
    const {message_id, room_id} = req.body;

    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query('INSERT INTO messages(message_id, room_id) VALUES($1, $2);', [message_id, room_id], (err, result) => {
            done();
            if (err) {
                return res.send(err);
            }
            return res.status(200).json({success: true});
        });
    });
});

router.get('/homepage', function (req, res, next) {
    return res.render('chat-homepage', {user: req.session.userData});
});

router.get(`/username/:user_id`, function (req, res, next) {
    const id = req.params.user_id;
    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query('SELECT * FROM users where user_id = $1;', [id], (err, result) => {
            done();
            if (err) {
                return res.send(err);
            }

            return res.json({result: result.rows});
        });
    });

});

router.get(`/soba/:id`, function (req, res, next) {

    return res.render('chat', {user: req.session.userData.id});

});

router.get(`/porukesobe/:id`, function (req, res, next) {
    const room_id = req.params.id;
    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query('SELECT * FROM messages where room_id = $1;', [room_id], (err, result) => {
            done();
            if (err) {
                return res.send(err);
            }

            return res.json({messages: result.rows});
        });
    });

});

router.post(`/create_room/:groupID`, function (req, res, next) {
    const groupID = req.params.groupID;
    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query('INSERT INTO rooms(room_id,type_room) VALUES($1,$2);', [groupID, 1], (err, result) => {
            done();
            if (err) {
                return res.send(err);
            }

            return res.status(200).json({success: true});
        });
    });

});

router.get("/get_users", function (req, res, next) {

    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query('SELECT * FROM users;', [], (err, result) => {
            done();
            if (err) {
                return res.send(err);
            }
            const usernameList = result.rows.map(user => user.username);
            return res.json({list: usernameList});
        });
    });

});

router.get("/get_user_id/:id", function (req, res, next) {
    const userID = req.params.id;
    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query('SELECT * FROM users where username = $1;', [userID], (err, result) => {
            done();
            if (err) {
                return res.send(err);
            }
            return res.json({id: result.rows[0].user_id});
        });
    });

});

router.post("/create_private_room/:id", async function (req, res, next) {
    const roomID = req.params.id;
    const userObj = req.body.userObj;

    const client = await pool.connect();
    try {
        const roomName = `Conversation between ${userObj.name} and ${userObj.currentUsername}`;
        const roomResult = await client.query('INSERT INTO rooms (room_id, type_room, room_name) VALUES ($1, $2, $3);', [roomID, 2, roomName]);

        const user1_id = userObj.currentUser;
        const user2_id = userObj.selectedUser;

        await client.query('INSERT INTO members (room_id, user_id) VALUES ($1, $2), ($1, $3);',
            [roomID, user1_id, user2_id]);

        return res.status(200).json({success: true});
    } catch (err) {
        console.error(err);
        return res.status(500).send(err);
    } finally {
        client.release();
    }

});

router.get("/get_rooms_and_users/:id", async function (req, res, next) {
    const userID = req.params.id;

    const client = await pool.connect();
    try {

        const roomQuery = await client.query('SELECT members.room_id FROM members INNER JOIN rooms as r on r.room_id = members.room_id INNER JOIN type_room as tr on tr.type_room_id = r.type_room WHERE tr.type_room_id = 2 AND user_id = $1;', [userID]);
        let roomList = roomQuery.rows.map(row => row.room_id);

        const groupRoomQuery = await client.query('SELECT members.room_id FROM members INNER JOIN rooms as r on r.room_id = members.room_id INNER JOIN type_room as tr on tr.type_room_id = r.type_room WHERE tr.type_room_id = 1 AND user_id = $1;', [userID]);
        let groupRoomList = groupRoomQuery.rows.map(row => row.room_id);

        let memberIdList = [];
        if (roomList.length > 0 || groupRoomList.length > 0 ) {
            const memberQuery = await client.query(
                'SELECT user_id FROM members WHERE room_id = ANY($1::uuid[]);',
                [roomList]
            );
            memberIdList = memberQuery.rows.map(row => row.user_id);
            let s = new Set(memberIdList);
            memberIdList = [...s];
        }
        const allUsersQuery = await client.query('SELECT * FROM users;', []);
        let allUsersList = allUsersQuery.rows.map(row => row.user_id);
        let alluserscopy = allUsersList;

        allUsersList = allUsersList.filter(e => e !== userID);
        let listOfPossibleUsersPrivate = allUsersList.filter((e) => !memberIdList.includes(e));
        const userQuery = await client.query('SELECT username FROM users WHERE user_id = ANY($1::uuid[]);', [listOfPossibleUsersPrivate]);
        const userList = userQuery.rows.map(row => row.username);

        const allUserQuery = await client.query('SELECT username FROM users WHERE user_id = ANY($1::uuid[]);', [alluserscopy]);
        const allUserList = allUserQuery.rows.map(row => row.username);

        roomList = [...roomList, ...groupRoomList];

        const roomNameQuery = await client.query('SELECT room_name FROM rooms WHERE room_id = ANY($1::uuid[]);', [roomList]);
        const roomNameList = roomNameQuery.rows.map(row => row.room_name);



        return res.json({roomList: roomList, listUsers: userList, roomNameList: roomNameList, allUsers: allUserList});

    } catch (err) {
        console.error(err);
        return res.status(500).send(err);
    } finally {
        client.release();
    }

});

router.get("/logout", async function (req, res, next) {

    const client = await pool.connect();
    try {

        const deleteSession = await client.query('DELETE FROM session WHERE sid = $1;', [req.sessionID]);
        const userID = req.session.userData.id;
        console.log(userID);
        await client.query('UPDATE status SET online = 0 WHERE user_id = $1;',
            [userID]);

        res.clearCookie('connect.sid');
        return res.redirect('/login');
    } catch (err) {
        console.error(err);
        return res.status(500).send(err);
    } finally {
        client.release();
    }

});

router.post("/send_message", function (req, res, next) {
    const {privateName, message, sender_id} = req.body.messageData;
    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query('INSERT INTO messages(sender_id, room_id, content) VALUES($1, $2, $3);', [sender_id, privateName, message], (err, result) => {
            done();
            if (err) {
                return res.send(err);
            }

            return res.status(200).json({success: true});
        });
    });

});

router.get("/get_room_members/:id", function (req, res, next) {
    const roomID = req.params.id;
    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query('SELECT u.user_id,u.username, s.online FROM users as u INNER JOIN status as s ON s.user_id = u.user_id INNER JOIN members as m ON m.user_id = u.user_id WHERE  m.room_id = $1;', [roomID], (err, result) => {
            done();
            if (err) {
                return res.send(err);
            }

            return res.send(result.rows);
        });
    });

});

router.get("/lastid", function (req, res, next) {

    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query('SELECT id FROM messages ORDER BY id DESC LIMIT 1;', [], (err, result) => {
            done();
            if (err) {
                return res.send(err);
            }

            return res.send(result.rows[0]);
        });
    });

});

router.post("/set_online/:id", function (req, res, next) {
    const userID = req.params.id;
    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query('UPDATE status SET online = 1 WHERE user_id = $1;', [userID], (err, result) => {
            done();
            if (err) {
                return res.send(err);
            }
            return res.status(200).json({success: true});
        });
    });

});

router.delete("/message/:id", function (req, res, next) {
    const messageID = req.params.id;
    pool.connect((err, client, done) => {
        if (err) {
            return res.send(err);
        }
        client.query('DELETE FROM messages WHERE id = $1;', [messageID], (err, result) => {
            done();
            if (err) {
                return res.send(err);
            }

            return res.status(200).json({success: true});
        });
    });

});

router.post("/create_group_room/:id", async function (req, res, next) {
    const roomID = req.params.id;
    const userObj = req.body.userObj;

    const client = await pool.connect();
    try {
        const roomName = userObj.group_name;
        const userIDlist = userObj.selectedUserList;
        const roomResult = await client.query('INSERT INTO rooms (room_id, type_room, room_name) VALUES ($1, $2, $3);', [roomID, 1, roomName]);

        for (let i = 0; i < userIDlist.length; i++) {
            const userID = userIDlist[i];
            await client.query('INSERT INTO members (room_id, user_id) VALUES ($1, $2);', [roomID, userID]);
        }

        return res.status(200).json({success: true});
    } catch (err) {
        console.error(err);
        return res.status(500).send(err);
    } finally {
        client.release();
    }

});


module.exports = router;


