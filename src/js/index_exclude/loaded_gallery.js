// LOADED SCRIPT (FOR GALLERY PAGES)
// ==================================================
const main_fade_duration = 500;
function setHtmlLoaded() {
	$('html').addClass('loaded');
	/*let scroll_top = window.scrollY + $('#featuredTile')[0].getBoundingClientRect().top - 60;
	setTimeout(() => 
		window.scrollTo({
			top: scroll_top,
			behavior: 'smooth',
		}), 
		main_fade_duration);*/
}
$(document).ready(function() {
	//route_change(window.location.pathname);
	$(window).trigger('scroll');
	gallery_resize();
	setTimeout(setHtmlLoaded, 50);
});