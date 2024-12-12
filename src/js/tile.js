// TILE SCRIPT
// ==================================================
// Tile content initializer
let tile_content_top_offset = 30;
let tile_outer_height = 220;
let image_container_bottom_margin = 4;
let container_position_debounce = 250;

function set_tile_content_container_positions_procedure() {
	$('.tile-content-container').each(function() {
		// Uninitialize tile
		$(this).removeClass('initialized');
		$(this).css('margin-bottom', '');
		$(this).css('height', '');
		// Set tile-content-image-container height
		let image_container = $(this).find('.tile-content-image-container');
		$(image_container).css('height', '');
		setTimeout((function() {
			let image = $(image_container).children('picture');
			let image_ratio = parseFloat($(image).attr('image-ratio'));
			let image_padding_right = parseFloat($(image).css('padding-right'));
			let image_width = $(image).outerWidth() - image_padding_right;
			let image_height = image_width/image_ratio + image_container_bottom_margin;
			$(image_container).css('height', image_height+'px');
			// Set tile-content top position
			let tile = $(this).parent();
			let tile_top = $(tile).position().top;
			let tile_height = tile_outer_height;//$(tile).outerHeight(true);
			let top_val = tile_top + tile_height + tile_content_top_offset;
			$(this).css('top', top_val+'px');
			// Set tile-content height and tile margin-bottom
			let tile_content_outer_height = $(this).outerHeight(true);
			tile.css('margin-bottom', tile_content_outer_height+'px');
			let tile_content_height = $(this)[0].getBoundingClientRect().height;
			$(this).css('height', tile_content_height+'px');
			// Set tile-content to initialized
			$(this).addClass('initialized');
		}).bind(this), 200);
	});
	$('#featuredTile .tile-content-image-container').css('height', '');
}
let set_tile_content_container_positions_debounce = throttle(
	set_tile_content_container_positions_procedure, 
	container_position_debounce
);
function set_tile_content_container_positions() {
	set_tile_content_container_positions_debounce();
}
// set_tile_content_container_positions();

// Tile click handler
const tile_show_transition_duration = 200;
let tile_show_timeout = null;
let tile_scroll_timeout = null;

$('.tile-borders').bind('click', function() {
	let tile = $(this).parent('.tile');
	if($(tile).hasClass('show')) {
		$(tile).removeClass('show');
		$(tile).removeClass('selected');
	}
	else {
		clearTimeout(tile_show_timeout);
		clearTimeout(tile_scroll_timeout);
		$('.tile.selected').removeClass('selected');
		$(tile).addClass('selected');
		let scroll_time_offset = tile_show_transition_duration;
		let showing = $('.tile.show');
		if(tile_show_timeout !== null || $(showing).length > 0) {
			// Scroll adjustments
			scroll_time_offset += tile_show_transition_duration;
			// Timeout to wait for closing animtaion
			$(showing).removeClass('show');
			tile_show_timeout = setTimeout((() => {
					$(tile).addClass('show');
					tile_show_timeout = null;
				}).bind(tile), 
				tile_show_transition_duration+10);
		}
		else {
			$(tile).addClass('show');
		}
		// Scroll-to
		tile_scroll_timeout = setTimeout((() => {
				let mobile_width = window.innerWidth < 660;
				let scroll_target = mobile_width 
					? this.getBoundingClientRect().bottom - 40 
					: this.getBoundingClientRect().top - 100;
				let scroll_top = window.scrollY + scroll_target;
				window.scrollTo({
					top: scroll_top,
					behavior: 'smooth',
				});
			}).bind($(tile)[0]),
			scroll_time_offset);
	}
});