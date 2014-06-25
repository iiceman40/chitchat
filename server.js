// Module
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	conf = require('./config.json');

// Webserver
// auf den Port x schalten
var port = process.env.PORT || conf.port;
server.listen(port);

app.configure(function(){
	// statische Dateien ausliefern
	app.use(express.static(__dirname + '/public'));
});

// wenn der Pfad / aufgerufen wird
app.get('/', function (req, res) {
	// so wird die Datei index.html ausgegeben
	res.sendfile(__dirname + '/public/index.html');
});

// Websocket
var clients = [];
io.sockets.on('connection', function (client) {
	// erstelle anonymen Namen der noch nicht vergeben ist
	var anoName = 'Anonym', anonym = anoName, anonymInUse = true, anoCount = 0;
	while (anonymInUse){
		anonymInUse = false;
		for(i=0; i<clients.length; i++) if(clients[i].name == anonym) anonymInUse = true;
		if(anonymInUse) anonym = anoName + '-' + anoCount++;
	}

	// Connections
	// der Client ist verbunden
	clients.push({id: client.id, name: anonym}); // hinzufügen zur Liste der Teilnehme
	console.log('connected', client.id);

	io.to('chatroom').emit('chat', { time: new Date(), text: 'Ein Teilnehmer ist dem Chat beigetreten!', clients: clients });
	client.join('chatroom');
	client.emit('chat', { time: new Date(), text: 'Du bist dem Chat beigetreten!', clients: clients });
	client.emit('myId', {id: client.id});

	// wenn ein Benutzer einen Text senden
	client.on('chat', function (data) {
		client.emit('received');
		// so wird dieser Text an alle anderen Benutzer gesendet
		io.sockets.emit('sending');
		io.sockets.emit('chat', { time: new Date(), name: data.name || anonym, text: data.text, image: data.image, clients: clients });
	});

	// wenn ein Benutzer einen privaten Text an ausgewählte Nutzer sendet
	client.on('chatPrivate', function (data) {
		// bereite ein array der angesprochenen Benutzer vor
		targetNames = [];
		for(var i=0; i<data.targets.length; i++) targetNames.push(data.targets[i].name);
		// bereite die Nachricht vor
		message = {
			time: new Date(),
			name: data.name || anonym,
			text: data.text,
			image: data.image,
			type: 'private',
			targets: targetNames.join(),
			clients: clients
		};
		// übermittele die Nachricht an alle ausgewählten Nutzer
		for(i=0; i<data.targets.length; i++){
			target = data.targets[i];
			io.to(target.id).emit('chat', message);
		}
		// übermittle die Nachricht auch an den Nutzer selbst
		client.emit('chat', message);
	});

	// wenn Benutzer den Chat verlassen
	client.on('disconnect', function() {
		console.log('disconnected', client.id);
		thisClient = findWithAttr(clients,'id',client.id);
		oldName = thisClient.name || anonym;
		clients.splice(findWithAttr(clients,'id',client.id), 1);
		io.sockets.emit('chat', { time: new Date(), text: oldName  + ' hat den Chat verlassen', clients: clients });
	});

	// wenn Benutzer ihren Namen ändern
	client.on('nameChange', function(data) {
		tempClient = findWithAttr(clients,'id',client.id);
		oldName = clients[tempClient].name;
		clients[tempClient].name = data.name;
		io.sockets.emit('chat', { time: new Date(), text: 'Ein Teilnehmer hat seinen Namen geändert von "'+ oldName +'" zu "'+ data.name +'"!', clients: clients });
	});
});

function findWithAttr(array, attr, value) {
	for(var i = 0; i < array.length; i += 1) {
		if(array[i][attr] === value) {
			return i;
		}
	}
}

// Portnummer in die Konsole schreiben
console.log('Der Server läuft nun auf dem Port ' + port);