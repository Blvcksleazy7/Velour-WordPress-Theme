<?php
/**
 * Template Name: Velour Bundles
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>
<main id="main" class="velour-editorial-page velour-bundles-page">
	<header class="velour-bundles-hero"><div class="velour-container" data-velour-reveal><span class="velour-kicker"><?php esc_html_e( 'Velour sets', 'velour-standard' ); ?></span><h1><?php esc_html_e( 'Complete rituals for elevated spaces.', 'velour-standard' ); ?></h1><p><?php esc_html_e( 'Curated combinations for scent, structure and the daily act of becoming composed.', 'velour-standard' ); ?></p></div></header>
	<?php while ( have_posts() ) : the_post(); ?>
		<?php if ( '' !== trim( wp_strip_all_tags( get_the_content() ) ) ) : ?>
			<div class="velour-entry-content velour-container" data-velour-reveal><?php the_content(); ?></div>
		<?php else : ?>
			<section class="velour-editorial-section"><div class="velour-container velour-bundle-list" data-velour-reveal-group>
				<article class="velour-bundle-feature"><div class="velour-bundle-image velour-bundle-image--executive" data-velour-reveal="image"></div><div data-velour-reveal><span class="velour-eyebrow"><?php esc_html_e( 'The Executive Setup', 'velour-standard' ); ?></span><h2><?php esc_html_e( 'For the desk, the shelf and the final check before leaving.', 'velour-standard' ); ?></h2><p><?php esc_html_e( 'Fragrance, watch case and perfume display arranged as one disciplined system.', 'velour-standard' ); ?></p></div></article>
				<article class="velour-bundle-feature velour-bundle-feature--reverse"><div class="velour-bundle-image velour-bundle-image--signature" data-velour-reveal="image"></div><div data-velour-reveal><span class="velour-eyebrow"><?php esc_html_e( 'The Signature Ritual', 'velour-standard' ); ?></span><h2><?php esc_html_e( 'A focused edit for scent and surface.', 'velour-standard' ); ?></h2><p><?php esc_html_e( 'A fragrance and display pairing for a room that feels more intentional immediately.', 'velour-standard' ); ?></p></div></article>
				<article class="velour-bundle-feature"><img src="<?php echo esc_url( get_theme_file_uri( '/assets/images/velour-bundle-complete.avif' ) ); ?>" alt="<?php esc_attr_e( 'The Complete Velour Set', 'velour-standard' ); ?>" data-velour-reveal="image"><div data-velour-reveal><span class="velour-eyebrow"><?php esc_html_e( 'The Complete Velour Set', 'velour-standard' ); ?></span><h2><?php esc_html_e( 'The whole environment, composed.', 'velour-standard' ); ?></h2><p><?php esc_html_e( 'Fragrance, watch display, scent display and vision display for a complete personal ritual.', 'velour-standard' ); ?></p></div></article>
			</div></section>
		<?php endif; ?>
	<?php endwhile; ?>
</main>
<?php
get_footer();
