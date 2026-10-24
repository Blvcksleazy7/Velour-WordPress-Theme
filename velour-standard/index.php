<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>
<main id="main" class="site-main">
	<?php if ( have_posts() ) : ?>
		<?php while ( have_posts() ) : ?>
			<?php the_post(); ?>
			<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
				<h1><a href="<?php echo esc_url( get_permalink() ); ?>"><?php the_title(); ?></a></h1>
				<?php the_content(); ?>
			</article>
		<?php endwhile; ?>
		<?php the_posts_pagination(); ?>
	<?php else : ?>
		<p><?php esc_html_e( 'No content found.', 'velour-standard' ); ?></p>
	<?php endif; ?>
</main>
<?php get_footer(); ?>
