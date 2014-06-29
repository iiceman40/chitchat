// import modules
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	conf = require('./config.json');

/*
 * WEBSERVER
 */
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

var server = {name: 'ChitChat Server'};
var allMessages = [];

/*
 * MONGODB - with mongoose
 */
// set up db connection
var mongoose = require('mongoose');
mongoose.connect('mongodb://chitchat:chitchatdb@ds037447.mongolab.com:37447/chitchat');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
	console.log('database connection open');
});

// schemas
var userSchema = mongoose.Schema({
	user: {},
	name: String,
	email: String,
	password: String
});

var messageSchema = mongoose.Schema({
	time: Date,
	user: {},
	text: String,
	image: String,
	type: Number,
	targets: Array
});

// models
var User = mongoose.model('User', userSchema);
var Message = mongoose.model('Message', messageSchema);

// get all public messages in db and send them to the client
Message.find({'type': 1}, function(err, messages){
	allMessages = messages;
});

/*
 * WEBSOCKETS - with socket.io
 */
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

	// tell everybody a new user joined the chat
	thisClient = findWithAttr(clients,'id',client.id);
	message = {time: new Date(), user: server, text: 'Ein Teilnehmer ist dem Chat beigetreten!', type: 0};
	io.to('chatroom').emit('chat', { message: message, clients: clients });

	client.join('chatroom'); // put new client in 'chatroom'

	// submit all public messages to the new user
	client.emit('messageHistory', { messageHistory: allMessages});

	// tell the new user he is in the chat now
	message = {time: new Date(), user: server, text: 'Du bist dem Chat beigetreten!', type: 0};
	client.emit('chat', {message: message, clients: clients});
	client.emit('myId', {id: client.id});

	/*
	 * HANDLE EVENTS FOR THIS SOCKET
	 */
	// user sends message
	client.on('chat', function (data) {
		console.log('chatdata', data);
		data = cleanData(data);
		client.emit('received');
		// save message to DB
		var message = new Message({
			time: new Date(),
			user: data.user,
			text: data.text,
			image: data.image,
			type: 1 // public
		});
		message.save(function (err, msg) {
			if (err) return console.error(err);
		});
		allMessages.push(message);
		// submit message
		io.sockets.emit('sending');
		io.sockets.emit('chat', {message: message, clients: clients});
	});

	// user sends private message to selected users
	client.on('chatPrivate', function (data) {
		data = cleanData(data);
		client.emit('received');
		var message = new Message({
			time: new Date(),
			user: data.user,
			text: data.text,
			image: data.image,
			type: 2, // public
			targets: data.targets
		});
		// submit message
		client.emit('chat', {message: message, clients: clients});
		// send message to all selected users
		for(i=0; i<data.targets.length; i++){
			target = data.targets[i];
			io.to(target.id).emit('sending');
			io.to(target.id).emit('chat', {message: message, clients: clients});
		}
	});

	// user left chat
	client.on('disconnect', function() {
		console.log('disconnected', client.id);
		thisClient = findWithAttr(clients,'id',client.id);
		oldName = thisClient.name || anonym;
		clients.splice(findWithAttr(clients,'id',client.id), 1);
		message = {time: new Date(), user: server, text: oldName  + ' hat den Chat verlassen', type: 0};
		io.sockets.emit('chat', {message: message, clients: clients});
	});

	// user changed name
	client.on('nameChange', function(data) {
		data = cleanData(data);
		tempClient = findWithAttr(clients,'id',client.id);
		oldName = clients[tempClient].name;
		clients[tempClient].name = data.name;
		message = {time: new Date(), user: server, text: 'Ein Teilnehmer hat seinen Namen geändert von "'+ oldName +'" zu "'+ data.name +'"!', type: 0};
		io.sockets.emit('chat', {message: message, clients: clients });
	});

	// user started typing
	client.on('startedTyping', function() {
		io.sockets.emit('userStartedTyping', { id: client.id });
	});
	// user stopped typing
	client.on('stoppedTyping', function() {
		io.sockets.emit('userStoppedTyping', { id: client.id });
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
			if(typeof data[prop].replace === 'function')
				data[prop] = data[prop].replace(/<(?:.|\n)*?>/gm, '');
		}
	}
	return data;
}

console.log('Der Server läuft nun auf dem Port ' + port);