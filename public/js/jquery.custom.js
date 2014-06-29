$(document).ready(function(){
	// bug reports
	$('#bug-panel').hoverIntent(
		function(){
			$(this).animate({
				right: '-50px'
			})
		},
		function(){
			$(this).animate({
				right: '-220px'
			})
		}
	)

	// targets for PM as tooltip
	$('body').tooltip({
		selector: '.makeTooltip'
	});
});