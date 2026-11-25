// Lokální zprostředkovací server PeerJS pro testy hry více hráčů (tests/net.py).
// Potřebuje balíček "peer": npm install peer   (spouští ho tests/net.py sám)
const express = require('express');
const http = require('http');
const { ExpressPeerServer } = require('peer');
const port = +(process.argv[2] || 9000);
const app = express();
const server = http.createServer(app);
app.use('/', ExpressPeerServer(server, { path: '/' }));
server.listen(port, '127.0.0.1', () => console.log('peer server ' + port));
