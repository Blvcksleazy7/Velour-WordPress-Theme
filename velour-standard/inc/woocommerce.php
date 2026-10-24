<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( class_exists( 'WC_Product' ) ) {
	require_once get_theme_file_path( '/template-parts/product-card.php' );
}

function velour_standard_woocommerce_setup(): void {
	add_theme_support( 'woocommerce' );
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );

	remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10 );
	remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10 );
	remove_action( 'woocommerce_no_products_found', 'wc_no_products_found', 10 );
	add_action( 'woocommerce_before_main_content', 'velour_standard_woocommerce_wrapper_start', 10 );
	add_action( 'woocommerce_after_main_content', 'velour_standard_woocommerce_wrapper_end', 10 );
	add_action( 'woocommerce_no_products_found', 'velour_standard_no_products_found', 10 );
}

add_action( 'after_setup_theme', 'velour_standard_woocommerce_setup', 20 );

function velour_standard_woocommerce_wrapper_start(): void {
	if ( function_exists( 'is_shop' ) && ( is_shop() || is_product_taxonomy() ) ) {
		echo '<main id="main" class="velour-shop velour-shop--archive">';
		return;
	}

	echo '<main id="main" class="velour-shop velour-shop--single">';
}

function velour_standard_woocommerce_wrapper_end(): void {
	echo '</main>';
}

function velour_standard_no_products_found(): void {
	?>
	<section class="velour-commerce-empty" aria-labelledby="velour-empty-products-title">
		<h2 id="velour-empty-products-title"><?php esc_html_e( 'No products are available', 'velour-standard' ); ?></h2>
		<p><?php esc_html_e( 'The collection is being prepared. Please return soon.', 'velour-standard' ); ?></p>
	</section>
	<?php
}

function velour_standard_cart_link(): string {
	if ( ! function_exists( 'WC' ) || ! function_exists( 'wc_get_cart_url' ) || ! WC()->cart ) {
		return '';
	}

	$count = WC()->cart->get_cart_contents_count();
	$label = sprintf(
		/* translators: %d is the number of items in the cart. */
		_n( 'View cart, %d item', 'View cart, %d items', $count, 'velour-standard' ),
		$count
	);

	return sprintf(
		'<a class="velour-cart-link" href="%1$s" aria-label="%2$s"><span aria-hidden="true">%3$s</span></a>',
		esc_url( wc_get_cart_url() ),
		esc_attr( $label ),
		esc_html( sprintf( __( 'Cart (%d)', 'velour-standard' ), $count ) )
	);
}

function velour_standard_append_cart_link( string $items, object $args ): string {
	if ( ! class_exists( 'WooCommerce' ) || ! isset( $args->theme_location ) || 'primary' !== $args->theme_location ) {
		return $items;
	}

	$cart_link = velour_standard_cart_link();

	if ( '' === $cart_link ) {
		return $items;
	}

	return $items . '<li class="velour-cart-menu-item">' . $cart_link . '</li>';
}

add_filter( 'wp_nav_menu_items', 'velour_standard_append_cart_link', 10, 2 );

function velour_standard_cart_fragments( array $fragments ): array {
	$cart_link = velour_standard_cart_link();

	if ( '' !== $cart_link ) {
		$fragments['a.velour-cart-link'] = $cart_link;
	}

	return $fragments;
}

add_filter( 'woocommerce_add_to_cart_fragments', 'velour_standard_cart_fragments' );
