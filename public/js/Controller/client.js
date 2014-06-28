$(document).ready(function(){
	var pageTitle = 'ChitChat';
	var favicon = new Favico({
		animation: 'none'
	});
	var typing;

	// WebSocket
	var socket = io.connect();

	var ChatViewModel = function (){
		var self = this;

		/*
		 * OBSERVABLES
		 */
		this.focused = ko.observable(true);
		this.pageTitle = ko.observable('The ChitChat');
		this.count = ko.observable(0);

		this.messages = ko.observableArray();
		this.members = ko.observableArray();
		this.name = ko.observable();
		this.previousName = ko.observable();
		this.message = ko.observable();
		this.sending = ko.observable(false);
		this.receiving = ko.observable(false);
		this.image = ko.observable('');
		this.isTyping = ko.observable(false);

		/*
		 * SUBSCRIPTIONS
		 */
		this.name.subscribe(function(oldName){
			this.previousName(oldName);
		}, this, "beforeChange");
		this.name.subscribe(function(newName){
			(!newName) ? self.name(self.previousName()) : socket.emit('nameChange', { name: newName });;
		});
		this.message.subscribe(function(){
			// TODO add check if message is private!
			if(!self.isTyping())
				socket.emit('startedTyping');
			self.isTyping(true);
			window.clearTimeout(typing);
			typing = window.setTimeout(function(){
				self.isTyping(false);
				socket.emit('stoppedTyping');
			},2000);
		});

		/*
		 * METHODS
		 */
		// Messages
		this.addMessage = function(data){
			self.messages.push(new Message(data));
		}
		// Members
		this.setMembers = function(data){
			currentMembers = ko.toJS(self.members);
			self.members([]);

			$.each(data, function(key, thisMemberData){
				// check if a member with this id already exists
				thisMemberExists =  ko.utils.arrayFilter(currentMembers, function(member) {
					return member.id == thisMemberData.id;
				});

				if(thisMemberExists.length > 0){
					thisMemberData.selected = thisMemberExists[0].selected;
					thisMemberData.isMe = thisMemberExists[0].isMe;
				}
				self.addMember(thisMemberData);
			});
		}
		this.addMember = function(data){
			self.members.push(new Member(data));
		}
		this.removeMember = function(member){
			self.members.remove(member);
		}
		this.toggleMember = function(member){
			if(!member.isMe()){
				if(member.selected())
					member.selected(false);
				else
					member.selected(true);
			}
		}
		// Image
		this.addImage = function(){
			$('#files').trigger('click');
		}
		// Send Message
		this.send = function(){
			if(self.message() || self.image()){
				if(self.selectedMembers().length > 0){
					// private message
					socket.emit('chatPrivate', { name: self.name(), text: self.message(), image: self.image().tag, targets: ko.toJS(self.selectedMembers) });
				} else {
					// socket send
					message = { name: self.name(), text: self.message() };
					if(self.image() && self.image().tag)
						message.image = self.image().tag;
					socket.emit('chat', message);
				}
				// clear message and image
				self.message('');
				self.image('');
				self.sending(true);
				//console.log('client sending message - sending: ', self.sending(), new Date());
				self.isTyping(false);
				socket.emit('stoppedTyping');
			}
		}

		/*
		 * COMPUTED OBSERVABLES
		 */
		this.selectedMembers = ko.computed(function(){
			return ko.utils.arrayFilter(self.members(), function(member) {
				return member.selected();
			});
		}, this);
		this.imageLabel = ko.computed(function(){
			if(self.image() && self.image().name){
				name = self.image().name;
				if(name.length > 18){
					nameArray = name.split('.');
					fileExt = nameArray[nameArray.length-1];
					nameArray.pop();
					name = nameArray.join('.');
					return name.substring(0, 12) + '[...].' + fileExt;
				} else return self.image().name;
			} else return 'Bild hinzufügen';
		}, this);

		/*
		 * SOCKET HANDLER
		 */
		// Received Message History
		socket.on('messageHistory', function (data) {
			self.messages([]);
			if(data.messageHistory){
				$.each(data.messageHistory, function(key, message){
					self.addMessage(message);
				});
			}
		});
		// Received Message
		socket.on('chat', function (data) {
			self.addMessage(data.message);
			if(data.clients)
				self.setMembers(data.clients);

			if(!self.focused()){
				self.pageTitle('Neue Nachricht!');
				self.count(self.count()+1);
				favicon.badge(self.count());
			}

			// always scroll down to show the latest message
			window.scrollTo(0, document.body.scrollHeight);
			self.receiving(false);
			//console.log('client message recieved - receiving: ', self.receiving(), new Date());
		});
		// Received ID
		socket.on('myId', function(data){
			console.log('myId', data);
			for(i=0; i < self.members().length; i++){
				member = self.members()[i];
				if(member.id() == data.id) member.isMe(true);
			}
		});
		// Server received message
		socket.on('received', function(data){
			self.sending(false);
			//console.log("server message recieved - sending: ", self.sending(), new Date());
		});
		// Server is sending a message
		socket.on('sending', function(data){
			self.receiving(true);
			//console.log("incoming message from server - receiving: ", self.receiving(), new Date());
		});

		socket.on('userStartedTyping', function(data){
			user = getUserById(data.id, self.members());
			//console.log(user.name() + ' started typing');
			user.isTyping(true);
		});

		socket.on('userStoppedTyping', function(data){
			user = getUserById(data.id, self.members());
			//console.log(user.name() + ' stopped typing');
			user.isTyping(false);
		});

		// File Handler
		$('#files').change(function(evt) {
			var files = evt.target.files; // FileList object
			// Loop through the FileList and render image files as thumbnails.
			for (var i = 0, f; f = files[i]; i++) {
				// Only process image files.
				if (!f.type.match('image.*')) continue;

				var reader = new FileReader();
				// Closure to capture the file information.
				reader.onload = (function(theFile) {
					return function(e) {
						self.image({
							tag: '<img src="'+e.target.result+'" title="'+ theFile.name+'" class="image-attachment" />',
							name: theFile.name
						});
					};
				})(f);
				// Read in the image file as a data URL.
				reader.readAsDataURL(f);
			}
		});

		// focus
		window.onfocus = function() {
			self.focused(true);
			self.pageTitle(pageTitle);
			self.count(0);
			favicon.reset();
		};
		window.onblur = function() {
			self.focused(false);
		};
	};
	ko.applyBindings(new ChatViewModel(), document.getElementById("htmlTop"));

	setTimeout(function(){
		$('#members-panel').find('.panel-body').popover('show').on('shown.bs.popover', function () {
			$(this).next('.popover').find('.popover-title').append('<button id="members-panel-popover-close" type="button" class="close">&times;</button>');
			popup = $(this);
			$('#members-panel-popover-close').click(function(){
				popup.popover('hide');
			});
		});
	},500)

	function getUserById(id, users){
		filtered = ko.utils.arrayFilter(users, function(user) {
			return user.id() == id;
		});
		return filtered[0];
	}

});

