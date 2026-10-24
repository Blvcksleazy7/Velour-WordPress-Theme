<?php
/**
 * Template Name: About Velour
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>
<main id="main" class="velour-editorial-page velour-about-page">
	<header class="velour-about-hero">
		<div class="velour-container" data-velour-reveal>
			<span class="velour-kicker"><?php esc_html_e( 'About Velour', 'velour-standard' ); ?></span>
			<h1><?php esc_html_e( 'A room should reveal discipline before it reveals taste.', 'velour-standard' ); ?></h1>
			<p><?php esc_html_e( 'Velour is a luxury personal environment brand built around scent, structure and intentional living.', 'velour-standard' ); ?></p>
		</div>
	</header>
	<?php while ( have_posts() ) : the_post(); ?>
		<?php if ( '' !== trim( wp_strip_all_tags( get_the_content() ) ) ) : ?>
			<div class="velour-entry-content velour-container" data-velour-reveal><?php the_content(); ?></div>
		<?php else : ?>
			<section class="velour-editorial-section"><div class="velour-container velour-about-story"><img src="<?php echo esc_url( get_theme_file_uri( '/assets/images/velour-perfume-display.png' ) ); ?>" alt="<?php esc_attr_e( 'A Velour perfume display', 'velour-standard' ); ?>" data-velour-reveal="image"><div data-velour-reveal><span class="velour-eyebrow"><?php esc_html_e( 'Quiet luxury', 'velour-standard' ); ?></span><h2><?php esc_html_e( 'Presence is built in private.', 'velour-standard' ); ?></h2><p><?php esc_html_e( 'The clean surface. The selected fragrance. The case that holds the watch. The tray that contains the final objects of the day. Velour exists for people who believe environment shapes behaviour.', 'velour-standard' ); ?></p></div></div></section>
			<section class="velour-editorial-section velour-principles"><div class="velour-container velour-principle-grid" data-velour-reveal-group><article data-velour-reveal><span>01</span><h2><?php esc_html_e( 'Discipline', 'velour-standard' ); ?></h2><p><?php esc_html_e( 'Objects arranged with intention change how the day begins.', 'velour-standard' ); ?></p></article><article data-velour-reveal><span>02</span><h2><?php esc_html_e( 'Environment', 'velour-standard' ); ?></h2><p><?php esc_html_e( 'Your space speaks before you do. It should speak clearly.', 'velour-standard' ); ?></p></article><article data-velour-reveal><span>03</span><h2><?php esc_html_e( 'Ritual', 'velour-standard' ); ?></h2><p><?php esc_html_e( 'Scent and structure turn routine into a private standard.', 'velour-standard' ); ?></p></article></div></section>
		<?php endif; ?>
	<?php endwhile; ?>
</main>
<?php
get_footer();
