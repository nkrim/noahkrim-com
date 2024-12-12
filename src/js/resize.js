// RESIZE SCRIPT
// ==================================================
const two_tile_width_max = 659;
let prev_width = $(window).width();

let resize_timeout = null;

$(window).resize(function() {
	// Check for width change, if no change then return
	let width = $(window).width();
	if(width === prev_width)
		return;
	prev_width = width;

	// Quickly close all tiles
	$('.tile-set').addClass('quick-close');
	$('.tile').removeClass('show');
	$('.tile-set').removeClass('quick-close');

	// Set short timeout to ensure tile-content is closed before repositioning and resizing content
	if(resize_timeout)
		clearTimeout(resize_timeout);
	resize_timeout = setTimeout(function() {
		set_tile_content_container_positions();
	}, 210);
});