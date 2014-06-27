$(document).ready(function(){
	$('#bug-panel').hoverIntent(
		function(){
			$(this).animate({
				left: '-50px'
			})
		},
		function(){
			$(this).animate({
				left: '-220px'
			})
		}
	)
});