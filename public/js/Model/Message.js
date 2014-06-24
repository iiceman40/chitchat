var Message = function(data){
	var selfMessage = this;

	this.name = ko.observable(data.name);
	this.text = ko.observable(data.text);
	this.time = ko.observable(data.time);
	this.type = ko.observable(data.type);
	this.targets = ko.observable(data.targets);

	this.image = ko.observable(data.image);

	this.timeFormated = ko.computed(function(){
		time = new Date(selfMessage.time());
		return '[' + (time.getHours() < 10 ? '0' + time.getHours() : time.getHours())+ ':' + (time.getMinutes() < 10 ? '0' + time.getMinutes() : time.getMinutes()) + ']';
	}, this);
}