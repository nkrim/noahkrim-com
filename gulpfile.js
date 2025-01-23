// Includes
const { src, dest, series, parallel, lastRun } = require('gulp');
const clean = require('gulp-clean');
const log = require('fancy-log');
const newer = require('gulp-newer');
const { exec, execSync } = require('child_process');
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
const imagemin =require('imagemin');
const webp = require('imagemin-webp');
// galleryprep
const imageResize = require('gulp-image-resize');
const jeditor = require('gulp-json-editor');

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
		r_text_dir: 'pug_includes/data_descriptions/',
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
				'scroll.js',
			],
			'gallery': [
				//'_utils.js',
				'index_exclude/gallery_viewer.js',
				'index_exclude/gallery_resize.js',
				'index_exclude/loaded_gallery.js',
				'index_exclude/router_override.js',
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
paths.clean = paths.out.base;
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
const cfdistro = 'E272WVRDL39R5C';

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

// Data aggregation
function data_aggregate(cb) {
	for (let rel of r_data.releases) {
		try {
			const html = fs.readFileSync(paths.pug.r_text_dir + rel.number + '.html', 'utf8');
			let text = html;
			text = text
				.replace(/<[^>]*>/g, ' ')  // Replace HTML tags with a space
				.replace(/\s+/g, ' ')      // Replace multiple spaces with single space
				.trim();                   // Remove leading/trailing spaces
			rel.description_html = html;
			rel.description_text = text;
		} catch (error) {
			console.error('Error aggregating', rel.number + '.html');
			rel.description_html = '';
			rel.description_text = '';
		}
	}
	cb();
}

// Resources
function move_resources() {
	return src(paths.in.resources, {encoding: false})
		.pipe(newer(paths.out.base))
		.pipe(dest(paths.out.base));
}
function webp_images(cb) {
	imagemin([paths.in.resource_images], {
		destination: paths.out.webp,
		plugins: [
			webp({ quality: image_quality })
		]
	});
	cb();
	/*return src(paths.in.resource_images)
		.pipe(newer({
			dest: paths.out.webp,
			ext: '.webp'
		}))
		.pipe(imagemin([
			webp({quality: image_quality}),
		]))
		.pipe(rename({extname: ".webp"}))
		.pipe(dest(paths.out.webp));*/
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
function upload(cb) {
	try {
		execSync(`./aws.py`, { stdio: 'inherit' });
		cb();
	} catch (error) {
		cb(new Error(`Upload failed: {error}`));
	}
}

// Cleanup
function clean_build() {
	return src(paths.clean).pipe(clean());
}
function clean_gallery() {
	return src(paths.clean_gallery).pipe(clean());
}

// Exports - clean
exports.clean = clean_build;
exports.clean_gallery = clean_gallery;
exports.clean_full = series(clean_build, clean_gallery);
// Exports - standard
exports.galleryprep = series(data_gallery_viewer_scale_calc, parallel(...gallery_image_prep()));
exports.resources = series(webp_images, move_resources);
exports.js = parallel(index_js, ...alt_js());
exports.css = css;
exports.html = series(data_aggregate, parallel(index, ...release_pages()/*, ...gallery_pages()*/));
// Exports - build combo
exports.build_inplace = parallel(exports.html, css, exports.js, exports.resources);
exports.build = series(clean, exports.build_inplace);
exports.build_gallery = series(exports.clean_full, exports.galleryprep, exports.build_inplace);
exports.nohtml = parallel(css, exports.js, exports.resources);
// Exports - uploading
exports.upload = upload;
// Exports - combos
exports.full = series(exports.build, exports.upload);
exports.fresh = series(exports.clean, exports.build, exports.upload);
// Exports - default
exports.default = exports.build_inplace;
