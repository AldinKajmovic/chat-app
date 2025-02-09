
const axios = require('axios');

module.exports = (io) => {
    io.on('connection', (socket) => {

        socket.on('create_group', ({ conversation_id, user }) => {
            socket.join(conversation_id);

            axios.post(`http://localhost:3001/chat/create_group_room/${conversation_id}`, {
                userObj: user
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            axios.get(`http://localhost:3001/chat/get_rooms_and_users/${user.currentUser}`);
        });
        socket.on('create_private', ({ conversation_id, user }) => {
            socket.join(conversation_id);

            axios.post(`http://localhost:3001/chat/create_private_room/${conversation_id}`, {
                userObj: user
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            axios.get(`http://localhost:3001/chat/get_rooms_and_users/${user.currentUser}`);
        });

        socket.on('join_room', ({userID, roomID}) => {
            io.emit('user-status-changed', { userID, online: true });
            socket.join(roomID);
        });

        socket.on('send-message', ({ privateName, message, sender_id }) => {
            socket.join(privateName);
            io.to(privateName).emit('receive-message', { message, sender_id });

        });


        socket.on('disconnect', () => {

        });
    });
};
