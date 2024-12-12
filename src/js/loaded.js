// LOADED SCRIPT
// ==================================================
function setHtmlLoaded() {
	$('html').addClass('loaded');
	set_tile_content_container_positions();//_procedure();
}
$(document).ready(function() {
	route_change(window.location.pathname);
	$(window).trigger('scroll');
	setTimeout(setHtmlLoaded, 50);
});