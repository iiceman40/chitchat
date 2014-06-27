var Member = function(data){
	var selfMember = this;

	this.id = ko.observable(data.id);
	this.name = ko.observable(data.name);
	this.selected = ko.observable(data.selected || false);
	this.isMe = ko.observable(data.isMe || false);
	this.isTyping = ko.observable(false);

}