// PHOTO VIEWER FOR GALLERY
// ========================

// TODO
// - event listener on all photos to open up viewer with their picture
// - async loading of hi-res images for viewer
// - viewer image change and sliding

// REFERENCES
// ----------
const gallery_images = $('.gallery-image');
const gallery_sections = $('.gallery-section')
const viewer_image_list = $('#viewerImageList');
const photo_viewer  = $('#photoViewer');

// Variables
// ---------
let cur_index = -1;
let viewer_open = false;

// UTILITY FUNCTIONS
// -----------------
function open_viewer() {
	photo_viewer.addClass('viewer-open');
}
function close_viewer() {
	photo_viewer.removeClass('viewer-open');
	unset_image();
}

function load_image(p, is_gallery_image=false) {
	if($(p).hasClass('viewer-image-loaded'))
		return false;
	$(p).addClass('viewer-image-loaded');
	let s1 = document.createElement('source');
	s1.srcset = $(p).attr('data-path');
	s1.type = $(p).attr('data-type');
	let s2 = document.createElement('source');
	s2.srcset = $(p).attr('alt-data-path');
	s2.type = $(p).attr('alt-data-type');
	let i3 = document.createElement('img');
	i3.src = $(p).attr('alt-data-path');
	i3.alt = $(p).attr('data-name');
	if(is_gallery_image)
		i3.tabindex = parseInt($(p).attr('gallery-index'))+1;
	p.appendChild(s1);
	p.appendChild(s2);
	p.appendChild(i3);
	return true;
}

function set_image(i) {
	// Check if `i` is an edge image and disable buttons
	if(i <= 0)
		$('#viewerLeftButton').addClass('button-disabled');
	else
		$('#viewerLeftButton').removeClass('button-disabled');
	if(i >= viewer_image_list.children().length-1)
		$('#viewerRightButton').addClass('button-disabled');
	else
		$('#viewerRightButton').removeClass('button-disabled');
	// Make image viewable
	let p = viewer_image_list.children()[i];
	$(p).addClass('prep-image');
	viewer_image_list.children().removeClass('show-image');
	$(p).addClass('show-image');
	$(p).removeClass('prep-image');
	// Set cur_index
	cur_index = i;
	// Set #viewerText
	$('#viewerText').text(`${$(p).attr('data-section')} - ${$(p).attr('data-name')}`);
	// Load 2 after
	let max_j = Math.min(cur_index+2, viewer_image_list.children().length-1);
	for(let j=cur_index+1; j<=max_j; j++) {
		load_image(viewer_image_list.children()[j]);
	}
	// Load 2 before
	let min_j = Math.max(cur_index-2, 0);
	for(let j=cur_index-1; j>=min_j; j--) {
		load_image(viewer_image_list.children()[j]);
	}
}
function unset_image() {
	viewer_image_list.children().removeClass('show-image');
	cur_index = -1;
}

function next_image() {
	if($('#viewerRightButton').hasClass('button-disabled'))
		return;
	let i = Math.max(cur_index+1, 0);
	if(i < 0 || i >= viewer_image_list.children().length) {
		console.warn(`next_image(): index ${i} not in range`);
		return false;
	}
	set_image(i);
}

function prev_image() {
	if($('#viewerLeftButton').hasClass('button-disabled'))
		return;
	let i = Math.min(cur_index-1, viewer_image_list.children().length-1);
	if(i < 0 || i >= viewer_image_list.children().length) {
		console.warn(`prev_image(): index ${i} not in range`);
		return false;
	}
	set_image(i);
}

// LAZY LOADING GALLERY
// --------------------
/*const threshold = 300;
const section_loaded_class = 'gallery-section-loaded';
function lazy_load_gallery() {
	console.log(gallery_sections.length);
	const window_height = window.innerHeight;
	gallery_sections.each((_, section) => {
		if($(section).hasClass(section_loaded_class))
			return;
		console.log(section)
		if(section.getBoundingClientRect().top - window_height <= threshold) {
			$(section).addClass(section_loaded_class);
			console.log(`loading: ${$(section).find('gallery-section-title').text()}`)
			$(section).find('picture').each((_, p) => {
				load_image(p, true);
			});
		}
	});
}
$(window).scroll(lazy_load_gallery);*/

// EVENT HANDLERS
// --------------
function expand_image_handler(i) {
	return function() {
		// Load image
		let viewer_image = viewer_image_list.children()[i];
		load_image(viewer_image);
		// Open viewer
		open_viewer();
		set_image(i);
	}
}

// APPLY EVENT HANDLERS TO ELEMENTS
// --------------------------------
function apply_image_open_handlers() {
	gallery_images.each(function(i) {
		let index = parseInt($(this).attr('gallery-index'));
		let f = expand_image_handler(index);
		$(this).click(f);
	});
}

function apply_keyhandlers() {
	$(document).keydown(function(e) {
		// If photo-viewer is open, arrowkeys and esc
		if(photo_viewer.hasClass('viewer-open')) {
			if(e.which === 39) {
				e.preventDefault();
				next_image();
			}
			else if(e.which === 37) {
				e.preventDefault();
				prev_image();
			}
			else if(e.which === 27) {
				e.preventDefault();
				close_viewer();
			}
		}
		// Else, handle enter on focused object
		else {
			if(e.which === 13) {
				let elem = e.target;
				if(elem.tagName === 'IMG')
					elem = e.target.parentElement;
				if($(elem).hasClass('gallery-image')) {
					e.preventDefault();
					const gallery_index = parseInt($(elem).attr('gallery-index'));
					expand_image_handler(gallery_index)();
				}
			}
		}
	});
}

// RUN ON START
// ============
apply_image_open_handlers();
apply_keyhandlers();
$('#viewerRightButton').click(next_image);
$('#viewerLeftButton').click(prev_image);
$('#viewerTopClose, #viewerBottomClose').click(close_viewer);