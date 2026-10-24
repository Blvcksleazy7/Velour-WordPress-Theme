<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>
<main id="main" class="velour-not-found">
	<section class="velour-container velour-not-found__inner"><span class="velour-eyebrow">404</span><h1><?php esc_html_e( 'This piece is out of place.', 'velour-standard' ); ?></h1><p><?php esc_html_e( 'Return to the collection, or search for the fragrance, display or set you had in mind.', 'velour-standard' ); ?></p><div class="velour-cta-row"><a class="velour-button" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Return home', 'velour-standard' ); ?></a><a class="velour-text-link" href="<?php echo esc_url( home_url( '/shop/' ) ); ?>"><?php esc_html_e( 'Browse the shop', 'velour-standard' ); ?></a></div><?php get_search_form(); ?></section>
</main>
<?php
get_footer();
