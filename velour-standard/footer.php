<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
	<footer class="site-footer velour-footer">
		<div class="velour-footer-grid">
			<div class="velour-footer-brand">
				<a class="velour-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php bloginfo( 'name' ); ?></a>
				<p class="velour-footer-tagline"><?php esc_html_e( 'Structure. Presence. Intention.', 'velour-standard' ); ?></p>
			</div>

			<div class="velour-footer-column">
				<h2><?php esc_html_e( 'Shop', 'velour-standard' ); ?></h2>
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'footer_shop',
						'container'      => false,
						'menu_class'     => 'velour-footer-links',
						'fallback_cb'    => false,
					)
				);
				?>
			</div>

			<div class="velour-footer-column">
				<h2><?php esc_html_e( 'Company', 'velour-standard' ); ?></h2>
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'footer_company',
						'container'      => false,
						'menu_class'     => 'velour-footer-links',
						'fallback_cb'    => false,
					)
				);
				?>
			</div>

			<div class="velour-footer-social-column">
				<h2><?php esc_html_e( 'Connect', 'velour-standard' ); ?></h2>
				<a class="velour-footer-email" href="mailto:info.velorfragrances@gmail.com">info.velorfragrances@gmail.com</a>
				<div class="velour-footer-social-links" aria-label="<?php esc_attr_e( 'Velour social media', 'velour-standard' ); ?>">
					<a href="https://www.instagram.com/velour_standard" target="_blank" rel="noopener noreferrer" aria-label="Instagram @velour_standard">Instagram</a>
					<a href="https://www.tiktok.com/@thevelourstandard" target="_blank" rel="noopener noreferrer" aria-label="TikTok @thevelourstandard">TikTok</a>
					<a href="https://www.facebook.com/VelourStandard" target="_blank" rel="noopener noreferrer" aria-label="Facebook Velour Standard">Facebook</a>
				</div>
			</div>
		</div>
	</footer>
</div>
<?php wp_footer(); ?>
</body>
</html>
