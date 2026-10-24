<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="velour-skip-link screen-reader-text" href="#main"><?php esc_html_e( 'Skip to content', 'velour-standard' ); ?></a>
<div class="velour-shell">
	<header class="site-header">
		<div class="velour-announcement"><?php esc_html_e( 'Structure. Presence. Intention.', 'velour-standard' ); ?></div>
		<nav class="velour-nav" aria-label="<?php esc_attr_e( 'Primary navigation', 'velour-standard' ); ?>">
			<div class="velour-brand">
				<?php if ( has_custom_logo() ) : ?>
					<?php the_custom_logo(); ?>
				<?php else : ?>
					<a class="velour-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php bloginfo( 'name' ); ?></a>
				<?php endif; ?>
			</div>

			<?php
			wp_nav_menu(
				array(
					'theme_location' => 'primary',
					'container'      => false,
					'menu_class'     => 'velour-links',
					'fallback_cb'    => false,
				)
			);
			?>

			<button
				class="velour-menu-btn"
				type="button"
				data-mobile-menu
				data-label-open="<?php esc_attr_e( 'Open menu', 'velour-standard' ); ?>"
				data-label-close="<?php esc_attr_e( 'Close menu', 'velour-standard' ); ?>"
				aria-controls="velour-mobile-navigation"
				aria-expanded="false"
				aria-label="<?php esc_attr_e( 'Open menu', 'velour-standard' ); ?>"
			>
				<span class="velour-menu-icon" aria-hidden="true"><span></span><span></span><span></span></span>
			</button>
		</nav>

		<div
			id="velour-mobile-navigation"
			class="velour-mobile-panel"
			data-velour-mobile-panel
			role="dialog"
			aria-modal="true"
			aria-label="<?php esc_attr_e( 'Mobile menu', 'velour-standard' ); ?>"
			tabindex="-1"
			hidden
		>
			<nav aria-label="<?php esc_attr_e( 'Mobile navigation', 'velour-standard' ); ?>">
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'primary',
						'container'      => false,
						'menu_class'     => 'velour-mobile-links',
						'fallback_cb'    => false,
					)
				);
				?>
			</nav>
		</div>
	</header>
