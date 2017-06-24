var http = require("http");
var ws = require("nodejs-websocket");
var fs = require("fs");

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/crowclaim');


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    // we're connected!
    console.log('we\'re connected!')
});


var chatMessage = mongoose.Schema({
},{ strict: false });

var Message = mongoose.model('Message', chatMessage);


http.createServer(function (req, res) {
    fs.createReadStream("index.html").pipe(res)
}).listen(8080);

var conversation = {};


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

                delete data.message._id ;
                var msg = new Message(data.message);
                msg.save(function (err, msg) {
                    if (err) return console.error(err);
                    console.log('saved : ',msg);
                });

                broadcast({
                    event: 'new message conversationID:' + data.conversationId,
                    data: str.data.message
                    // username: str.data.username,
                    // message: str.data.message,
                    // conversationId: str.data.conversationId

                });

                break;

            case 'login':
                broadcast({
                    event: 'login',
                    data: {conversation: conversation}

                });
                break;



        }
        if(str.event.indexOf('get message conversationID:') === 0){
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
