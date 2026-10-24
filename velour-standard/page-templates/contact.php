<?php
/**
 * Template Name: Contact Velour
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();

$status            = isset( $_GET['contact_status'] ) ? sanitize_key( wp_unslash( $_GET['contact_status'] ) ) : '';
$form_started_at   = time();
$form_timing_token = wp_hash( (string) $form_started_at, 'nonce' );
?>
<main id="main" class="velour-editorial-page velour-contact-page">
	<header class="velour-contact-hero"><div class="velour-container" data-velour-reveal><span class="velour-kicker"><?php esc_html_e( 'Client care', 'velour-standard' ); ?></span><h1><?php esc_html_e( 'Speak to Velour.', 'velour-standard' ); ?></h1><p><?php esc_html_e( 'For launch enquiries, product care, bundles and private sourcing.', 'velour-standard' ); ?></p></div></header>
	<?php while ( have_posts() ) : the_post(); ?>
		<?php if ( '' !== trim( wp_strip_all_tags( get_the_content() ) ) ) : ?><div class="velour-entry-content velour-container" data-velour-reveal><?php the_content(); ?></div><?php endif; ?>
	<?php endwhile; ?>
	<section class="velour-editorial-section"><div class="velour-container velour-contact-grid" data-velour-reveal-group>
		<div class="velour-contact-details" data-velour-reveal><span class="velour-eyebrow"><?php esc_html_e( 'Concierge', 'velour-standard' ); ?></span><h2><?php esc_html_e( 'A quiet note is enough.', 'velour-standard' ); ?></h2><p><?php esc_html_e( 'Tell us what you need and the Velour team will respond by email.', 'velour-standard' ); ?></p><a href="mailto:info.velorfragrances@gmail.com">info.velorfragrances@gmail.com</a></div>
		<div class="velour-contact-form-wrap" data-velour-reveal>
			<?php if ( 'submitted' === $status ) : ?><p class="velour-form-message velour-form-message--success" role="status"><?php esc_html_e( 'Your note has been submitted. Velour will respond shortly.', 'velour-standard' ); ?></p><?php endif; ?>
			<?php if ( 'invalid' === $status ) : ?><p class="velour-form-message velour-form-message--error" role="alert"><?php esc_html_e( 'Please check every required field and try again.', 'velour-standard' ); ?></p><?php endif; ?>
			<?php if ( 'rate_limited' === $status ) : ?><p class="velour-form-message velour-form-message--error" role="alert"><?php esc_html_e( 'Too many notes were submitted. Please wait ten minutes and try again.', 'velour-standard' ); ?></p><?php endif; ?>
			<?php if ( 'error' === $status ) : ?><p class="velour-form-message velour-form-message--error" role="alert"><?php esc_html_e( 'Your note could not be sent. Please email Velour directly.', 'velour-standard' ); ?></p><?php endif; ?>
			<form class="velour-contact-form" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
				<input type="hidden" name="action" value="velour_standard_contact">
				<?php wp_nonce_field( 'velour_standard_contact', 'velour_contact_nonce' ); ?>
				<input type="hidden" name="velour_started_at" value="<?php echo esc_attr( (string) $form_started_at ); ?>">
				<input type="hidden" name="velour_timing_token" value="<?php echo esc_attr( $form_timing_token ); ?>">
				<div class="velour-honeypot" aria-hidden="true"><label for="velour-website">Website</label><input id="velour-website" type="text" name="velour_website" tabindex="-1" autocomplete="off"></div>
				<label class="velour-field"><span>Full Name</span><input class="velour-input" type="text" name="velour_name" maxlength="120" autocomplete="name" required></label>
				<label class="velour-field"><span>Email Address</span><input class="velour-input" type="email" name="velour_email" maxlength="254" autocomplete="email" required></label>
				<label class="velour-field"><span>Order Number (Optional)</span><input class="velour-input" type="text" name="velour_order_number" maxlength="64" autocomplete="off"></label>
				<label class="velour-field"><span>Subject</span><select class="velour-input" name="velour_subject" required><option value="" selected disabled><?php esc_html_e( 'Select a subject', 'velour-standard' ); ?></option><option value="General Enquiry">General Enquiry</option><option value="Order Support">Order Support</option><option value="Shipping Question">Shipping Question</option><option value="Return Request">Return Request</option><option value="Product Recommendation">Product Recommendation</option><option value="Wholesale / Partnership">Wholesale / Partnership</option><option value="Other">Other</option></select></label>
				<label class="velour-field"><span>Message</span><textarea class="velour-input" name="velour_message" rows="7" maxlength="5000" required></textarea></label>
				<button class="velour-button" type="submit"><?php esc_html_e( 'Send enquiry', 'velour-standard' ); ?></button>
			</form>
		</div>
	</div></section>
</main>
<?php
get_footer();
