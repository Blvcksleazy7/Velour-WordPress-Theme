<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header( 'shop' );

if ( class_exists( 'WooCommerce' ) && function_exists( 'woocommerce_product_loop' ) && function_exists( 'wc_get_product' ) ) {
	do_action( 'woocommerce_before_main_content' );
	?>
	<div class="velour-shop-header-reveal" data-velour-reveal>
	<?php
	do_action( 'woocommerce_shop_loop_header' );
	?>
	</div>
	<?php

	if ( woocommerce_product_loop() ) {
		do_action( 'woocommerce_before_shop_loop' );
		?>
		<div class="velour-product-reveal-group" data-velour-reveal-group>
		<?php
		woocommerce_product_loop_start();

		while ( have_posts() ) {
			the_post();
			do_action( 'woocommerce_shop_loop' );

			$product = wc_get_product( get_the_ID() );

			if ( $product instanceof WC_Product ) {
				?>
				<li <?php wc_product_class( 'velour-product-grid__item', $product ); ?>>
					<?php velour_standard_product_card( $product ); ?>
				</li>
				<?php
			}
		}

		woocommerce_product_loop_end();
		?>
		</div>
		<?php
		do_action( 'woocommerce_after_shop_loop' );
	} else {
		do_action( 'woocommerce_no_products_found' );
	}

	do_action( 'woocommerce_after_main_content' );
	do_action( 'woocommerce_sidebar' );
} else {
	?>
	<main id="main" class="velour-shop velour-shop--archive">
		<section class="velour-commerce-empty" aria-labelledby="velour-inactive-shop-title" data-velour-reveal>
			<h1 id="velour-inactive-shop-title"><?php esc_html_e( 'The shop is temporarily unavailable', 'velour-standard' ); ?></h1>
			<p><?php esc_html_e( 'WooCommerce is not active. Product browsing will return when the shop service is available.', 'velour-standard' ); ?></p>
		</section>
	</main>
	<?php
}

get_footer( 'shop' );
