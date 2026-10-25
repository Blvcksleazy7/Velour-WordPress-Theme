<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>
<main id="main" class="velour-search-results">
	<header class="velour-page-header velour-container"><span class="velour-eyebrow"><?php esc_html_e( 'Velour search', 'velour-standard' ); ?></span><h1><?php printf( esc_html__( 'Results for: %s', 'velour-standard' ), esc_html( get_search_query() ) ); ?></h1><?php get_search_form(); ?></header>
	<div class="velour-container velour-result-list">
		<?php if ( have_posts() ) : ?>
			<?php while ( have_posts() ) : the_post(); ?><article <?php post_class( 'velour-search-result' ); ?>><h2><a href="<?php echo esc_url( get_permalink() ); ?>"><?php echo esc_html( get_the_title() ); ?></a></h2><?php the_excerpt(); ?></article><?php endwhile; ?>
			<?php the_posts_pagination(); ?>
		<?php else : ?>
			<section class="velour-editorial-empty"><h2><?php esc_html_e( 'No matches yet.', 'velour-standard' ); ?></h2><p><?php esc_html_e( 'Try another phrase or browse the full collection.', 'velour-standard' ); ?></p><a class="velour-text-link" href="<?php echo esc_url( home_url( '/shop/' ) ); ?>"><?php esc_html_e( 'Visit the shop', 'velour-standard' ); ?></a></section>
		<?php endif; ?>
	</div>
</main>
<?php
get_footer();
