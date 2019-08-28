var express = require("express");
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors')
app.use(cors())
app.use(express.static("chatapp"));
var mysql = require('mysql');

///////////////////////////////////////////////////////////////////////////////////////////////
var socket = require("socket.io");
var http = require('http');

var currentServer = app.listen(8080, "localhost");
console.log("Chat app is running on port 8080");

var webSocket = socket(currentServer);
webSocket.on('connection', function (socket) {
    // console.log(socket.id);
    socket.on("chatWithUser", function (data) {
        console.log(data);
        var loggedInID = data.from;
        var sendTo = data.sendTo;
        var msg = data.msgBody;
        insertMessageToDB(loggedInID, sendTo, msg);
        webSocket.sockets.emit("chatWithUser", data);
    });

    socket.on('userLoggedIn', function (data) {
        webSocket.sockets.emit("userLoggedIn", 1);
    });
    socket.on('userLoggedOut', function (data) {
        webSocket.sockets.emit("userLoggedOut", 1);
    });
});
////////////////////////////////////////////////////////////////////////////////////////////////
app.use(bodyParser.json({ limit: '50mb' }));

//My sql creadentials and connection
var mysqlCon = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "chatapp_db"
});

//connect to mysql
mysqlCon.connect(function (err) {
    if (err) throw err;
    // console.log("Connected!");
});

//get the existing user names
app.get("/getUserNames", cors(), function (req, res) {
    mysqlCon.query("select user_name from tbl_user", function (err, result) {
        if (err) throw err;
        res.status(200).json(result);
    });
});

//Uodate the users status
app.post("/updateActiveStatus", cors(), function (req, res) {
    var user_id = req.body.user_id;
    var status = req.body.status;
    var query = "UPDATE tbl_user SET isActive=" + status + " WHERE user_id=" + user_id;
    mysqlCon.query(query, function (err, result) {
        if (err) throw err;
        res.status(200).json(result);
    });
});

//Data of user who goingn to login
app.post("/getUserLoginData", cors(), function (req, res) {
    var userName = req.body.user_name;
    // console.log("select * from tbl_user as us, tbl_user_message as um where us.user_name='" + userName + "' AND um.sender_id = us.user_id;");
    mysqlCon.query("select * from tbl_user where user_name = '" + userName + "';", function (err, result) {
        // console.log(result)
        if (err) throw err;
        res.status(200).json(result);
    });
});

//Insert the user in table and start the chat
app.post("/newChat", cors(), function (req, res) {
    var newUserName = req.body.user_name;
    // console.log('request received:', req.body);
    mysqlCon.query("insert into tbl_user (user_name, isActive) values('" + newUserName + "',1)", function (err, result) {
        // console.log(result.insertId);
        if (err) throw err;
        res.status(200).json(result.insertId);
    });
});

//Get the particular data of user
app.post("/getPaticularUserData", cors(), function (req, res) {
    var userId = req.body.user_id;
    // console.log("select * from tbl_user_message where sender_id ='" + userId + "';");
    mysqlCon.query("select * from tbl_user_message where sender_id ='" + userId + "';", function (err, result) {
        // console.log(result);
        if (err) throw err;
        res.status(200).json(result);
    });
});

//Get the only active users list 1= active, 0 = inactive
app.get("/getActiveUsers", cors(), function (req, res) {
    mysqlCon.query("select * from tbl_user where isActive = 1;", function (err, result) {
        // console.log(result);
        if (err) throw err;
        res.status(200).json(result);
    });
});

//New message by the user
app.post("/sendNewMessage", cors(), function (req, res) {
    var sendTo = req.body.sendTo;
    var loggedInUserId = req.body.loggedInUserId;
    var message = req.body.message;
    // console.log(sendTo,loggedInUserId,message);
    // /*
    var result = insertMessageToDB(loggedInUserId, sendTo, message);
    if (err) throw err;
    res.status(200).json(result);
    // */
});

//Insert the message in database common function
function insertMessageToDB(loggedInUserId, sendTo, message) {
    mysqlCon.query("insert into tbl_user_message(sender_id, receiver_id, msg_body) values('" + loggedInUserId + "','" + sendTo + "','" + message + "');", function (err, result) {
        console.log(result);
        if (err) throw err;
        return result;
    });
}