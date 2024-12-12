// Router Override Script - for release page
// ==================================================
// Force reload when pressing back on this page to ensure it goes back to index
$(window).on('popstate', function() {
	location.reload();
});