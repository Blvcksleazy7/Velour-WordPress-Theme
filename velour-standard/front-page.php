<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();

$front_page_content   = '';
$has_authored_content = false;

if ( have_posts() ) {
	the_post();
	$front_page_content   = get_the_content();
	$has_authored_content = '' !== trim( wp_strip_all_tags( $front_page_content ) );
}

function velour_standard_product_term_url( string $slug, string $fallback ): string {
	if ( ! taxonomy_exists( 'product_cat' ) ) {
		return $fallback;
	}

	$term = get_term_by( 'slug', $slug, 'product_cat' );
	if ( ! $term ) {
		return $fallback;
	}

	$term_url = get_term_link( $term );
	return is_wp_error( $term_url ) ? $fallback : $term_url;
}

$shop_url       = get_post_type_archive_link( 'product' );
$shop_url       = $shop_url ? $shop_url : home_url( '/' );
$fragrances_url = velour_standard_product_term_url( 'fragrances', $shop_url );
$displays_url   = velour_standard_product_term_url( 'cases-displays', $shop_url );
$bundles_url    = home_url( '/bundles/' );
$about_url      = home_url( '/about-velour/' );
$fragrances     = array();
$displays       = array();

if ( ! $has_authored_content && function_exists( 'wc_get_products' ) ) {
	$fragrances = wc_get_products(
		array(
			'status'   => 'publish',
			'limit'    => 3,
			'category' => array( 'fragrances' ),
			'orderby'  => 'date',
			'order'    => 'DESC',
		)
	);
	$displays   = wc_get_products(
		array(
			'status'   => 'publish',
			'limit'    => 4,
			'category' => array( 'cases-displays' ),
			'featured' => true,
		)
	);
}
?>
<main id="main" class="velour-home">
	<header class="velour-home-hero">
		<div class="velour-container velour-home-hero__copy" data-velour-reveal>
			<span class="velour-kicker"><?php esc_html_e( 'Velour private environment', 'velour-standard' ); ?></span>
			<h1><?php esc_html_e( 'Your space speaks before you do.', 'velour-standard' ); ?></h1>
			<p><?php esc_html_e( 'A considered world of Middle Eastern fragrance, sculptural displays and quiet daily discipline.', 'velour-standard' ); ?></p>
			<div class="velour-cta-row">
				<a class="velour-button velour-button--light" href="<?php echo esc_url( $shop_url ); ?>"><?php esc_html_e( 'Shop collection', 'velour-standard' ); ?></a>
				<a class="velour-text-link" href="<?php echo esc_url( $fragrances_url ); ?>"><?php esc_html_e( 'Explore fragrances', 'velour-standard' ); ?></a>
			</div>
		</div>
	</header>

	<?php // Native front-page content replaces the complete default editorial body. ?>
	<?php if ( $has_authored_content ) : ?>
		<section class="velour-home-block velour-container velour-entry-content velour-home-authored" data-velour-reveal>
			<?php the_content(); ?>
		</section>
	<?php else : ?>
	<section class="velour-home-block">
		<div class="velour-container">
			<div class="velour-section-heading" data-velour-reveal>
				<span class="velour-eyebrow"><?php esc_html_e( 'New on Velour', 'velour-standard' ); ?></span>
				<h2><?php esc_html_e( 'Middle Eastern fragrances', 'velour-standard' ); ?></h2>
				<p><?php esc_html_e( 'Check out our latest offering', 'velour-standard' ); ?></p>
			</div>
			<div class="velour-product-grid velour-home-product-grid" data-velour-reveal-group>
				<?php if ( $fragrances && function_exists( 'velour_standard_product_card' ) ) : ?>
					<?php foreach ( $fragrances as $product ) : ?>
						<?php velour_standard_product_card( $product ); ?>
					<?php endforeach; ?>
				<?php else : ?>
					<div class="velour-editorial-empty"><h3><?php esc_html_e( 'A considered fragrance edit is on its way.', 'velour-standard' ); ?></h3><p><?php esc_html_e( 'The collection is being prepared. Please return soon.', 'velour-standard' ); ?></p></div>
				<?php endif; ?>
			</div>
		</div>
	</section>

	<section class="velour-home-block velour-home-categories">
		<div class="velour-container">
			<div class="velour-section-heading" data-velour-reveal><span class="velour-eyebrow"><?php esc_html_e( 'Shop by category', 'velour-standard' ); ?></span><h2><?php esc_html_e( 'Choose your ritual.', 'velour-standard' ); ?></h2></div>
			<div class="velour-category-grid" data-velour-reveal-group>
				<a href="<?php echo esc_url( $fragrances_url ); ?>" data-velour-reveal><span>01</span><strong><?php esc_html_e( 'Fragrances', 'velour-standard' ); ?></strong></a>
				<a href="<?php echo esc_url( $displays_url ); ?>" data-velour-reveal><span>02</span><strong><?php esc_html_e( 'Displays', 'velour-standard' ); ?></strong></a>
				<a href="<?php echo esc_url( $bundles_url ); ?>" data-velour-reveal><span>03</span><strong><?php esc_html_e( 'Bundles', 'velour-standard' ); ?></strong></a>
			</div>
		</div>
	</section>

	<section class="velour-home-block velour-home-featured">
		<div class="velour-container">
			<div class="velour-section-heading" data-velour-reveal><span class="velour-eyebrow"><?php esc_html_e( 'Featured collection', 'velour-standard' ); ?></span><h2><?php esc_html_e( 'Structure for the objects you choose.', 'velour-standard' ); ?></h2></div>
			<div class="velour-product-grid velour-home-product-grid" data-velour-reveal-group>
				<?php if ( $displays && function_exists( 'velour_standard_product_card' ) ) : ?>
					<?php foreach ( $displays as $product ) : ?>
						<?php velour_standard_product_card( $product ); ?>
					<?php endforeach; ?>
				<?php else : ?>
					<div class="velour-editorial-empty"><h3><?php esc_html_e( 'Display pieces, edited down.', 'velour-standard' ); ?></h3><p><?php esc_html_e( 'The collection is being prepared. Please return soon.', 'velour-standard' ); ?></p></div>
				<?php endif; ?>
			</div>
		</div>
	</section>

	<section class="velour-presence-statement" aria-label="<?php esc_attr_e( 'Velour presence statement', 'velour-standard' ); ?>" data-velour-reveal><p><?php esc_html_e( 'Define your presence.', 'velour-standard' ); ?></p></section>

	<section class="velour-home-block velour-home-story">
		<div class="velour-container velour-home-story__grid">
			<img src="<?php echo esc_url( get_theme_file_uri( '/assets/images/velour-perfume-display.png' ) ); ?>" alt="<?php esc_attr_e( 'Velour perfume display arranged on a refined surface', 'velour-standard' ); ?>" data-velour-reveal="image">
			<div data-velour-reveal><span class="velour-eyebrow"><?php esc_html_e( 'Our philosophy', 'velour-standard' ); ?></span><h2><?php esc_html_e( 'Presence is built in private.', 'velour-standard' ); ?></h2><p><?php esc_html_e( 'Order creates clarity. Scent creates presence. Velour brings together fragrance, structure and design to help you build an environment that reflects who you are becoming.', 'velour-standard' ); ?></p><a class="velour-text-link" href="<?php echo esc_url( $about_url ); ?>"><?php esc_html_e( 'Our story', 'velour-standard' ); ?></a></div>
		</div>
	</section>
	<?php endif; ?>
</main>
<?php
get_footer();
