CHAT APP

Features

    Private Chats: Users can create one-on-one private conversations.
    Group Chats: Users can create and manage group chats with multiple participants.
    Offline/Online Status: Tracks and displays user availability (online/offline).
    Real-time Messaging: Utilizes Socket.io for instant delivery of messages.
    Message Deletion: Users can delete their sent messages.
    Message Replies: Users can reply to specific messages in any conversation.

Tech Stack

    Backend: Node.js, Express.js
    Frontend: EJS 
    Database: PostgreSQL
    Real-Time Communication: Socket.io

Installation

Install dependencies:

npm install

Set up PostgreSQL:

    Create a new PostgreSQL database.

    Update the database connection credentials in .env file:

    DB_HOST=localhost
    DB_USER=your_user
    DB_PASS=your_password
    DB_NAME=your_database

Run database migrations (or create tables manually if needed):

    npm start

    Visit the app at http://localhost:3001 

Features in Progress

    Docker Support: A Docker version of the app will be provided soon.

Usage

    Sign Up/Log In: Create an account and log in to start using the chat.
    Create a Private Chat: Start a private conversation with another user.
    Create a Group Chat: Create a group chat with multiple participants.
    Send/Receive Messages: Type and send messages in real time. Messages will be instantly delivered to the other user(s).
    Online Status: See whether your contacts are online or offline.
    Delete Messages: Delete any of your messages in a conversation.
    Reply to Messages: Reply directly to any message in a conversation.


