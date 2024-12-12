// Includes
const { src, dest, series, parallel, lastRun } = require('gulp');
const del = require('del');
const log = require('fancy-log');
const newer = require('gulp-newer');
// html
const fs = require('fs');
const pug = require('gulp-pug');
const rename = require('gulp-rename');
// js
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
// css
const autoprefixer = require('autoprefixer');
const postcss = require('gulp-postcss');
const minifyCSS = require('gulp-csso');
// resources
const cwebp = require('gulp-cwebp');
// galleryprep
const imageResize = require('gulp-image-resize');
const jeditor = require('gulp-json-editor');
// upload
const s3upload = require('gulp-s3-upload')({useIAM: true});
// invalidate
const cloudfront = require('gulp-cloudfront-invalidate');

// UTILITY
// ---------------
function flat(arr, depth=1) {
	if(depth <= 0)
		return arr;
	let out_arr = [];
	for(let i=0; i<arr.length; i++) {
		if(!Array.isArray(arr[i]))
			out_arr.push(arr[i]);
		else {
			let res = flat(arr[i], depth-1);
			for(let j=0; j<res.length; j++)
				out_arr.push(res[j]);
		}
	}
	return out_arr;
}


// Paths
// ---------------
const paths = {
	pug: {
		r_data: 'data-releases.json',
		g_data: 'data-galleries.json',
		index: 'pug_templates/index-template.pug',
		release: 'pug_templates/release-template.pug',
		gallery: 'pug_templates/gallery-template.pug',
	},
	in: {
		css: 'src/css/*.css',
		js: ['src/js/*.js', '!src/js/index_exclude/*.js'],
		alt_js: {
			'release': [
				'index_exclude/loaded_release.js',
				'index_exclude/router_override.js',
				'invert.js',
				'scroll.js',
			],
			'gallery': [
				//'_utils.js',
				'index_exclude/gallery_viewer.js',
				'index_exclude/gallery_resize.js',
				'index_exclude/loaded_gallery.js',
				'index_exclude/router_override.js',
				'invert.js',
				'scroll.js',
			],
		},
		resources: 'resources/**/*',
		resource_images: 'resources/static/img/**/*.{jpg,png}',
		gallery_images_raw: 'raw_gallery_images/',
	},
	out: {
		base: 'build/',
		html: 'build/',
		css: 'build/static/css/',
		js: 'build/static/js/',
		webp: 'build/static/img/',
		gallery_prep: 'resources/static/img/g/'
	}
}
paths.clean = paths.out.base+'*';
paths.clean_gallery = paths.out.gallery_prep;



// Pug config
const pug_config = {
	// pretty: true,
};

// Pre-parse json
let r_data = JSON.parse(fs.readFileSync(paths.pug.r_data));
let g_data = JSON.parse(fs.readFileSync(paths.pug.g_data));

// s3 Metadata
const s3meta = {'uploaded-via': 'gulp-s3-upload'};
const s3cache = 'max-age=60,s-maxage=31536000';
const s3cache_browser = 'max-age=315360000,s-maxage=31536000';
const cfdistro = 'E2HS6DFR9V8QEP';

// Image quality
const image_quality = 85;

//=======================================================
// HTML - Pug
function index() {
	let filename = 'index.html';
  	return src(paths.pug.index)
    	.pipe(pug(
    		Object.assign({'locals': r_data}, pug_config)
    	))
    	.pipe(rename(filename))
    	.pipe(dest(paths.out.html));
}
function release_pages() {
	return r_data.releases.map(r => {
		let filename = `${r.number}.html`;
		return () => src(paths.pug.release)
			.pipe(pug(
	    		Object.assign({locals: r}, pug_config)
	    	))
	    	.pipe(rename(filename))
			.pipe(dest(paths.out.html))
		}
	);
}
function gallery_pages() {
	return g_data.galleries.map(g => {
		//let filename = `visual/${g.title.replace(/\s+/g, '-')}.html`;
		let filename = `visual/${g.url}.html`;
		return () => src(paths.pug.gallery)
			.pipe(pug(
				Object.assign({locals: g}, pug_config)
			))
			.pipe(rename(filename))
			.pipe(dest(paths.out.html))
		}
	);
}

// CSS
function css() {
  	return src(paths.in.css)
  		.pipe(newer(paths.out.css))
		.pipe(sourcemaps.init())
		.pipe(postcss([ autoprefixer() ]))
		.pipe(minifyCSS())
		.pipe(sourcemaps.write('.'))
		.pipe(dest(paths.out.css))
}

// JS - babel
function index_js() {
	const filename = 'index.min.js';
  	return src(paths.in.js)
  		.pipe(newer(paths.out.js+filename))
  		.pipe(sourcemaps.init())
	    .pipe(concat(filename))
	    .pipe(babel())
	    .pipe(uglify())
	    .pipe(sourcemaps.write("."))
	    .pipe(dest(paths.out.js));
}
function alt_js() {
	return Object.entries(paths.in.alt_js).map(([name, ps]) => {
		ps = ps.map(p => 'src/js/'+p);
		const filename = name+'.min.js';
		return () => src(ps)
			.pipe(newer(paths.out.js+filename))
			.pipe(sourcemaps.init())
		    .pipe(concat(filename))
		    .pipe(babel())
		    .pipe(uglify())
		    .pipe(sourcemaps.write("."))
		    .pipe(dest(paths.out.js))
		}
	);
}

// Resources
function move_resources() {
	return src(paths.in.resources)
		.pipe(newer(paths.out.base))
		.pipe(dest(paths.out.base));
}
function webp_images() {
	return src(paths.in.resource_images)
		.pipe(newer({
			dest: paths.out.webp,
			ext: '.webp'
		}))
		.pipe(cwebp({q: image_quality}))
		.pipe(dest(paths.out.webp));
}

// Gallery Prep
const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray
function data_gallery_viewer_scale_calc() {
	const epsilon = 0.0000001;
	g_data.galleries.map(g => {
		g.sections.map(s => {
			s.images.map(p => {
				p.viewer_width = Math.ceil(p.raw_width*(g.viewer_image_scaling/100.0) - epsilon);
				p.viewer_height = Math.ceil(p.raw_height*(g.viewer_image_scaling/100.0) - epsilon);
				p.preview_width = Math.ceil(p.raw_width*(g.preview_image_scaling/100.0) - epsilon);
				p.preview_height = Math.ceil(p.raw_height*(g.preview_image_scaling/100.0) - epsilon);
				return p;
			})
			return s;
		});
		return g;
	});
	return src(paths.pug.g_data)
		.pipe(jeditor({
			galleries: g_data.galleries,
		},
		{},
		{
			arrayMerge: overwriteMerge,
		}))
		.pipe(dest('./'));
}
function gallery_image_prep() {
	return flat(g_data.galleries.map(g => {
		return g.sections.map(s => {
			return s.images.map(p => {
				let source_file = `${paths.in.gallery_images_raw}${g.gallery_dir}${s.section_dir}${p.file}.${g.image_alt_ext}`;
				let output_file_no_suffix = `${g.gallery_dir}${s.section_dir}${p.file}`;
				return [
					() => {
						let filename = `${output_file_no_suffix}-${p.viewer_width}x${p.viewer_height}.${g.image_alt_ext}`;
						return src(source_file)
							.pipe(newer(paths.out.gallery_prep+filename))
							.pipe(imageResize({
								width: p.viewer_width,
								height: p.viewer_height,
							}))
							.pipe(rename(filename))
							.pipe(dest(paths.out.gallery_prep))
						},
					() => {
						let filename = `${output_file_no_suffix}-preview.${g.image_alt_ext}`;
						return src(source_file)
							.pipe(newer(paths.out.gallery_prep+filename))
							.pipe(imageResize({
								percentage: 25
							}))
							.pipe(rename(filename))
							.pipe(dest(paths.out.gallery_prep))
						},
				]
			});
		});	
	}), Infinity);
}

// Upload
let changed_keynames = null;
function upload() {
	changed_keynames = [];
	return src(paths.out.base+'**/*')
		.pipe(s3upload({
			Bucket: 'badoptics.co',
			ACL: 'private',
			maps:{
				Metadata: () => s3meta,
				CacheControl: (k) => {
					if(/static\/img\//.exec(k)) {
						return s3cache_browser
					}
					return s3cache;
				}
			},
			onChange: (k) => {
				changed_keynames.push('/'+k);
			}
		},{
			maxRetries: 5,
		}));
}

// Invalidate
function invalidate_custom(paths) {
	return src('*').pipe(
		cloudfront({
			distribution: cfdistro,
			paths: paths,
		}));
}
function invalidate_changed() {
	if(changed_keynames === null || changed_keynames.length === 0)
		return Promise.resolve(log('-- No changes, skipping invalidations'));
	log('-- INVALIDATING:');
	changed_keynames.forEach(e => log('-- '+e));
	return invalidate_custom(changed_keynames);
}
function invalidate_index() {
	return invalidate_custom(['/index.html']);
}
function invalidate_html() {
	return invalidate_custom(['/*.html']);
}
function invalidate_js() {
	return invalidate_custom(['/static/js/*']);
}
function invalidate_css() {
	return invalidate_custom(['/static/css/*']);
}
function invalidate_all() {
	return invalidate_custom(['/*']);
}

// Cleanup
function clean() {
	return del(paths.clean);
}
function clean_gallery() {
	return del(paths.clean_gallery);
}

// Exports - clean
exports.clean = clean;
exports.clean_gallery = clean_gallery;
exports.clean_full = series(clean, clean_gallery);
// Exports - standard
exports.galleryprep = series(data_gallery_viewer_scale_calc, parallel(...gallery_image_prep()));
exports.resources = series(webp_images, move_resources);
exports.js = parallel(index_js, ...alt_js());
exports.css = css;
exports.html = parallel(index, ...release_pages(), ...gallery_pages());
// Exports - build combo
exports.build_inplace = parallel(exports.html, css, exports.js, exports.resources);
exports.build = series(clean, exports.build_inplace);
exports.build_gallery = series(exports.clean_full, exports.galleryprep, exports.build_inplace);
exports.nohtml = parallel(css, exports.js, exports.resources);
// Exports - uploading
exports.upload = series(upload, invalidate_changed);
exports.upload_no_invalidate = upload;
exports.upload_ni = exports.upload_no_invalidate;
// Exports - invalidations
exports.invalidate_index = invalidate_index;
exports.invalidate_js = invalidate_js;
exports.invalidate_css = invalidate_css;
exports.invalidate_html = invalidate_html;
exports.invalidate_all = invalidate_all;
// Exports - combos
exports.full = series(exports.build, exports.upload);
exports.fresh = series(exports.build, exports.upload_no_invalidate, invalidate_all);
// Exports - default
exports.default = exports.build_inplace;
