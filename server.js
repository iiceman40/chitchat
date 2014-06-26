// import modules
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	conf = require('./config.json');

// web server
// config port to use
var port = process.env.PORT || conf.port;
server.listen(port);

app.configure(function(){
	// deploy all static assets
	app.use(express.static(__dirname + '/public'));
});

// if path / is called
app.get('/', function (req, res) {
	// deploy index.html
	res.sendfile(__dirname + '/public/index.html');
});

// Websocket
var clients = [];
io.sockets.on('connection', function (client) {
	// create a unique name for anonymous
	var anoName = 'Anonym', anonym = anoName, anonymInUse = true, anoCount = 0;
	while (anonymInUse){
		anonymInUse = false;
		for(i=0; i<clients.length; i++) if(clients[i].name == anonym) anonymInUse = true;
		if(anonymInUse) anonym = anoName + '-' + anoCount++;
	}

	// Connections
	// clients is now connected
	clients.push({id: client.id, name: anonym}); // add to suers list for this chat
	console.log('connected', client.id);

	io.to('chatroom').emit('chat', { time: new Date(), text: 'Ein Teilnehmer ist dem Chat beigetreten!', clients: clients });
	client.join('chatroom');
	client.emit('chat', { time: new Date(), text: 'Du bist dem Chat beigetreten!', clients: clients });
	client.emit('myId', {id: client.id});

	/*
	 * HANDLE EVENTS FOR THIS SOCKET
	 */
	// user sends message
	client.on('chat', function (data) {
		data = cleanData(data);
		client.emit('received');
		// so wird dieser Text an alle anderen Benutzer gesendet
		io.sockets.emit('sending');
		io.sockets.emit('chat', { time: new Date(), name: data.name || anonym, text: data.text, image: data.image, clients: clients });
	});

	// user sends private message to selected users
	client.on('chatPrivate', function (data) {
		data = cleanData(data);
		// prepare array of recipients
		targetNames = [];
		for(var i=0; i<data.targets.length; i++) targetNames.push(data.targets[i].name);
		// prepare message
		message = {
			time: new Date(),
			name: data.name || anonym,
			text: data.text,
			image: data.image,
			type: 'private',
			targets: targetNames.join(),
			clients: clients
		};
		// send message to all selected users
		for(i=0; i<data.targets.length; i++){
			target = data.targets[i];
			io.to(target.id).emit('chat', message);
		}
		// send message to this user
		client.emit('chat', message);
	});

	// user left chat
	client.on('disconnect', function() {
		console.log('disconnected', client.id);
		thisClient = findWithAttr(clients,'id',client.id);
		oldName = thisClient.name || anonym;
		clients.splice(findWithAttr(clients,'id',client.id), 1);
		io.sockets.emit('chat', { time: new Date(), text: oldName  + ' hat den Chat verlassen', clients: clients });
	});

	// user changed name
	client.on('nameChange', function(data) {
		data = cleanData(data);
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

function cleanData(data){
	for (var prop in data){
		if( prop != 'image' && data.hasOwnProperty(prop) ){
			data[prop] = data[prop].replace(/<(?:.|\n)*?>/gm, '');
		}
	}
	return data;
}

console.log('Der Server läuft nun auf dem Port ' + port);