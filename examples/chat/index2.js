var http = require("http");
var ws = require("nodejs-websocket");
var fs = require("fs");

http.createServer(function (req, res) {
    fs.createReadStream("index.html").pipe(res)
}).listen(8080);

var conversation = {};


var server = ws.createServer(function (connection) {
    var addedUser = false;
    connection.on("text", function (str) {


        str = JSON.parse(str);
        switch (str.event) {
            case 'new message' :
                var data = str.data
                conversation[data.conversationId] = conversation[data.conversationId] || [];
                conversation[data.conversationId].push({
                    username: data.username,
                    message: data.message
                });

                broadcast({
                    event: 'new message',
                    data: {
                        username: str.data.username,
                        message: str.data.message,
                        conversationId: str.data.conversationId
                    }
                });

                break;

            case 'login':
                broadcast({
                    event: 'login',
                    data: {conversation: conversation}

                })
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
