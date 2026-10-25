<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();

if ( class_exists( 'WooCommerce' ) && function_exists( 'woocommerce_content' ) ) {
	?><div class="velour-single-product-reveal" data-velour-reveal><?php
	woocommerce_content();
	?></div><?php
} else {
	?>
	<main id="main" class="velour-shop velour-shop--single">
		<section class="velour-commerce-empty" aria-labelledby="velour-inactive-product-title" data-velour-reveal>
			<h1 id="velour-inactive-product-title"><?php esc_html_e( 'This product is temporarily unavailable', 'velour-standard' ); ?></h1>
			<p><?php esc_html_e( 'WooCommerce is not active. Product details will return when the shop service is available.', 'velour-standard' ); ?></p>
		</section>
	</main>
	<?php
}

get_footer();
