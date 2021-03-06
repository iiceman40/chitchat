var Message = function(data){
	var selfMessage = this;

	this.user = ko.observable(data.user);
	this.text = ko.observable(replaceEmoticons(data.text));
	this.time = ko.observable(data.time);
	this.type = ko.observable(data.type);
	this.targets = ko.observableArray(data.targets);

	this.image = ko.observable(data.image);

	// computed
	this.name = ko.computed(function(){
		return selfMessage.user().name;
	}, this);

	this.timeFormated = ko.computed(function(){
		time = new Date(selfMessage.time());
		return (selfMessage.type()==3) ?
			'[' + (time.getHours() < 10 ? '0' + time.getHours() : time.getHours())+ ':' + (time.getMinutes() < 10 ? '0' + time.getMinutes() : time.getMinutes()) + " - " + time.getDate() + "." + time.getMonth() + "." + ']'
		    : '[' + (time.getHours() < 10 ? '0' + time.getHours() : time.getHours())+ ':' + (time.getMinutes() < 10 ? '0' + time.getMinutes() : time.getMinutes()) + ']';
	}, this);

	this.targetsString = ko.computed(function(){
		targetNames = [];
		if(selfMessage.targets())
			$.each(selfMessage.targets(), function(key, value){
				targetNames.push(value.name);
			});
		return targetNames.join(', ');
	}, this);


	/*
	 * HELPER FUNCTIONS
	 */
	function replaceEmoticons(text) {
		var emoticons = {
				':-)' : 'smiley1.svg',
				':)' : 'smiley1.svg',
				':D'  : 'smiley2.svg',
				':-|' : 'smiley3.svg',
				':-(' : 'smiley4.svg',
				':(' : 'smiley4.svg',
				':-o' : 'smiley5.svg',
				':P' : 'smiley6.svg',
				'^^' : 'smiley7.svg',
				'O_o' : 'smiley8.svg',
				';-)' : 'smiley9.svg',
				';)' : 'smiley9.svg'
			},
			patterns = [],
			metachars = /[[\]{}()*+?.\\|^$\-,&#\s]/g;

		// build a regex pattern for each defined property
		for (var i in emoticons) {
			if (emoticons.hasOwnProperty(i)){ // escape metacharacters
				patterns.push('('+i.replace(metachars, "\\$&")+')');
			}
		}

		// build the regular expression and replace
		return text.replace(new RegExp(patterns.join('|'),'g'), function (match) {
			return typeof emoticons[match] != 'undefined' ?
				'<img src="/images/smileys/'+emoticons[match]+'" width="21px" />' :
				match;
		});
	}
}