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

	// show now private messages only on private tab
	$('.message-tabs').find('li a').each(function(){
		var href = $(this).attr('href');
		$(this).click(function(){
			(href == '#private') ? $('#noPrivateMessages').show() : $('#noPrivateMessages').hide();
		});
	});

	// targets for PM as tooltip
	$('body').tooltip({
		selector: '.makeTooltip'
	});
});