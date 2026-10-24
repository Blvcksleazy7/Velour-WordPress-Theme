<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function velour_standard_setup(): void {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'custom-logo' );
	add_theme_support(
		'html5',
		array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' )
	);
	add_theme_support( 'editor-styles' );
	add_editor_style( 'style.css' );

	register_nav_menus(
		array(
			'primary'        => __( 'Primary', 'velour-standard' ),
			'footer_shop'    => __( 'Footer Shop', 'velour-standard' ),
			'footer_company' => __( 'Footer Company', 'velour-standard' ),
		)
	);
}

add_action( 'after_setup_theme', 'velour_standard_setup' );
