$(document).ready(function(){
	$('#bug-panel').hoverIntent(
		function(){
			$(this).animate({
				left: '-15px'
			})
		},
		function(){
			$(this).animate({
				left: '-200px'
			})
		}
	)
});

/*
 * Dynamically changing favicons with JavaScript
 * Works in all A-grade browsers except Safari and Internet Explorer
 * Demo: http://mathiasbynens.be/demo/dynamic-favicons
 */

// HTML5™, baby! http://mathiasbynens.be/notes/document-head
document.head || (document.head = document.getElementsByTagName('head')[0]);

function changeFavicon(src) {
	var link = document.createElement('link'),
		oldLink = document.getElementById('dynamic-favicon');
	link.id = 'dynamic-favicon';
	link.rel = 'shortcut icon';
	link.href = src;
	if (oldLink) {
		document.head.removeChild(oldLink);
	}
	document.head.appendChild(link);
}