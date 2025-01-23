// LOADED SCRIPT (FOR RELEASE PAGES)
// ==================================================
const main_fade_duration = 500;
function setHtmlLoaded() {
	$('html').addClass('loaded');
	let scroll_top = 0;
	setTimeout(() => 
		window.scrollTo({
			top: scroll_top,
			behavior: 'smooth',
		}), 
		main_fade_duration);
}
$(document).ready(function() {
	//route_change(window.location.pathname);
	$(window).trigger('scroll');
	setTimeout(setHtmlLoaded, 50);
});