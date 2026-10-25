<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function velour_standard_enqueue_assets(): void {
	$version = wp_get_theme()->get( 'Version' );

	wp_enqueue_style( 'velour-standard', get_stylesheet_uri(), array(), $version );

	// The adapted script is introduced by the shared-shell task.
	$script_path = get_theme_file_path( '/assets/js/velour.js' );
	if ( file_exists( $script_path ) ) {
		wp_enqueue_script(
			'velour-standard',
			get_theme_file_uri( '/assets/js/velour.js' ),
			array(),
			$version,
			true
		);
	}

	if ( is_page_template( 'page-templates/presence-profile.php' ) ) {
		$presence_script_path = get_theme_file_path( '/assets/js/velour-presence.js' );
		if ( file_exists( $presence_script_path ) ) {
			wp_enqueue_script(
				'velour-presence',
				get_theme_file_uri( '/assets/js/velour-presence.js' ),
				array(),
				$version,
				true
			);
			wp_localize_script(
				'velour-presence',
				'velourPresence',
				array(
					'recommendationUrl' => esc_url_raw( rest_url( 'velour/v1/recommendations' ) ),
					'productsUrl'       => esc_url_raw( rest_url( 'velour/v1/products' ) ),
					'nonce'              => wp_create_nonce( 'wp_rest' ),
				)
			);
		}
	}
}

add_action( 'wp_enqueue_scripts', 'velour_standard_enqueue_assets' );
