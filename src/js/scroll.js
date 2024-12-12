// HEADER SCROLL ANIMATION
// ==================================================
// Lerp helper
function lerp(x, y, t) {
	if(t < 0) t = 0;
	else if(t > 1) t = 1;
	return x + (y-x)*t;
}

// Scroll Handler
let scroll_thresh = 76;
let initial_header_scale = 2;
let lerp_scale = 1; // 1.1;

$(window).scroll(function() {
	let y = window.scrollY;
	let crossed_thresh = $('html').hasClass('scroll-threshold'); 
	let logos = $('#logoWrapper');
	if(y < scroll_thresh) {
		$('html').removeClass('scroll-threshold');
		let transform_scale = 'scale('+lerp(initial_header_scale, lerp_scale, y/scroll_thresh)+')';
		$(logos).css({
			'-webkit-transform' : transform_scale,
		  	'-moz-transform'    : transform_scale,
		  	'-ms-transform'     : transform_scale,
		 	'-o-transform'      : transform_scale,
		 	'transform'         : transform_scale,
		});
	}
	else if(!$('html').hasClass('scroll-threshold')) {
		$('html').addClass('scroll-threshold');
		let transform_scale = `scale(${lerp_scale})`;
		$(logos).css({
			'-webkit-transform' : transform_scale,
		  	'-moz-transform'    : transform_scale,
		  	'-ms-transform'     : transform_scale,
		 	'-o-transform'      : transform_scale,
		 	'transform'         : transform_scale,
		});
	}
});