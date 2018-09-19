"use strict"

let fs = require('fs');
let express = require('express');
let fetch = require('node-fetch');
let d2gsi = require('./dota2-gsi-fork');
let rp = require('request-promise');

let server = new d2gsi(
    {
        tokens: 'hello1234',
    }
);

let getIngameResources = (typename, name) => {
    let filepath = require('path').join(__dirname, 'cache', typename, name + '.png');

    return rp.get({ url: `http://cdn.dota2.com/apps/dota2/images/${typename}/${name}_lg.png`, encoding: null })
        .then((image) => {
            try {
                let fd = fs.openSync(filepath, 'wx');
                fs.writeSync(fd, image, 0, image.length);
            }
            finally {
                return filepath;
            }
        });
};
server.app.use(express.static('static'));
server.app.get('/image/hero/:hero_name.png', (req, res) =>
    getIngameResources('heroes', req.params.hero_name).then(
        (filepath) => res.sendFile(filepath)
    )
);
server.app.get('/image/item/:item_name.png', (req, res) =>
    getIngameResources('items', req.params.item_name).then(
        (filepath) => res.sendFile(filepath)
    )
);

let io = require('socket.io').listen(server.server);
server.events.on('newclient', (client) => {
    // check if client is a spectator
    if ('team2' in client.gamestate.player) {
        io.sockets.on('connection', (socket) => {
            console.log("connected to a client");

            client.on('newdata', (newdata) => {
                socket.emit('newdata', newdata);
            });

            client.on('disconnect', () => socket.close());
        });
    }
});
