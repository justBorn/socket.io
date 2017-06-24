var http = require("http");
var ws = require("nodejs-websocket");
var fs = require("fs");

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/crowclaim');


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    // we're connected!
    console.log('we\'re connected!')
});


var chatMessage = mongoose.Schema({}, {strict: false});

var Message = mongoose.model('Message', chatMessage);


http.createServer(function (req, res) {
    fs.createReadStream("index.html").pipe(res)
}).listen(8080);


var conversation = {};

Message.find({}, function (err, docs) {
    console.log('docs', docs);

    docs.forEach(function (doc) {
        conversation[doc.conversationId] = conversation[doc.conversationId] || [];
        conversation[doc.conversationId].push(doc);
    });
});


var server = ws.createServer(function (connection) {
    var addedUser = false;
    connection.on("text", function (str) {

        console.log(str)
        str = JSON.parse(str);
        var data = str.data;

        switch (str.event) {
            case 'new message' :
                console.log('new message : ', data);
                conversation[data.conversationId] = conversation[data.conversationId] || [];
                conversation[data.conversationId].push(data.message);


                var customId = data.message._id;
                delete data.message._id;
                data.message.customId = customId;
                console.log('data.message', data.message);
                var msg = new Message(data.message);
                msg.save(function (err, msg) {
                    if (err) return console.error(err);
                    console.log('saved : ', msg);

                    msg = msg.toObject();
                    console.log(msg)
                    msg._id = msg.customId;
                    console.log(msg)

                    broadcast({
                        event: 'new message conversationID:' + data.conversationId,
                        data: msg
                        // username: str.data.username,
                        // message: str.data.message,
                        // conversationId: str.data.conversationId

                    });
                });


                break;

            case 'login':
                broadcast({
                    event: 'login',
                    data: {conversation: conversation}

                });
                break;


        }
        if (str.event.indexOf('get message conversationID:') === 0) {
            broadcast({
                event: 'old message conversationID:' + data.conversationId,
                data: {conversation: conversation[data.conversationId]}

            });
        }


        // if (connection.nickname === null) {
        //     connection.nickname = str
        //     broadcast(str + " entered")
        // } else
        //     broadcast("[" + connection.nickname + "] " + str)
    });
    connection.on("close", function () {
        broadcast(connection.nickname + " left")
    })
});
server.listen(3000);

function broadcast(str) {
    str = JSON.stringify(str);
    server.connections.forEach(function (connection) {
        connection.sendText(str)
    })
}
