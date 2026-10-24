<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function velour_standard_product_card( WC_Product $product ): void {
	$name           = $product->get_name();
	$permalink      = $product->get_permalink();
	$price_html     = $product->get_price_html();
	$is_in_stock    = $product->is_in_stock();
	$is_purchasable = $product->is_purchasable();
	$image_html     = $product->get_image_id()
		? $product->get_image( 'woocommerce_thumbnail', array( 'class' => 'velour-product-image' ) )
		: wc_placeholder_img( 'woocommerce_thumbnail', array( 'class' => 'velour-product-image velour-product-image--placeholder' ) );
	?>
	<article class="velour-product-card" data-velour-reveal>
		<a class="velour-product-media" href="<?php echo esc_url( $permalink ); ?>" aria-label="<?php echo esc_attr( $name ); ?>">
			<?php echo wp_kses_post( $image_html ); ?>
		</a>
		<div class="velour-product-card__body">
			<h2 class="velour-product-title">
				<a href="<?php echo esc_url( $permalink ); ?>"><?php echo esc_html( $name ); ?></a>
			</h2>

			<?php if ( '' !== trim( wp_strip_all_tags( $price_html ) ) ) : ?>
				<div class="velour-product-price"><?php echo wp_kses_post( $price_html ); ?></div>
			<?php else : ?>
				<p class="velour-product-price velour-product-price--unavailable"><?php esc_html_e( 'Price unavailable', 'velour-standard' ); ?></p>
			<?php endif; ?>

			<?php if ( ! $is_in_stock ) : ?>
				<p class="velour-product-availability velour-product-availability--unavailable"><?php esc_html_e( 'Out of stock', 'velour-standard' ); ?></p>
			<?php elseif ( ! $is_purchasable ) : ?>
				<p class="velour-product-availability velour-product-availability--unavailable"><?php esc_html_e( 'Not available for purchase', 'velour-standard' ); ?></p>
			<?php else : ?>
				<p class="velour-product-availability"><?php esc_html_e( 'In stock', 'velour-standard' ); ?></p>
			<?php endif; ?>

			<?php if ( $is_purchasable && $is_in_stock ) : ?>
				<div class="velour-product-card__action">
					<?php
					if ( function_exists( 'woocommerce_template_loop_add_to_cart' ) ) {
						$had_global_product = array_key_exists( 'product', $GLOBALS );
						$previous_product   = $GLOBALS['product'] ?? null;
						$GLOBALS['product'] = $product;

						try {
							woocommerce_template_loop_add_to_cart();
						} finally {
							if ( $had_global_product ) {
								$GLOBALS['product'] = $previous_product;
							} else {
								unset( $GLOBALS['product'] );
							}
						}
					}
					?>
				</div>
			<?php endif; ?>
		</div>
	</article>
	<?php
}
