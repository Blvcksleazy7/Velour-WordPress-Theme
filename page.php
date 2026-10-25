<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>
<main id="main" class="velour-editorial-page">
	<?php while ( have_posts() ) : the_post(); ?>
		<header class="velour-page-header velour-container">
			<span class="velour-eyebrow"><?php esc_html_e( 'Velour Standard', 'velour-standard' ); ?></span>
			<h1><?php echo esc_html( get_the_title() ); ?></h1>
		</header>
		<div class="velour-entry-content velour-container"><?php the_content(); ?></div>
	<?php endwhile; ?>
</main>
<?php
get_footer();
