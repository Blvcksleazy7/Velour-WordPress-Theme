<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function velour_standard_contact_redirect( string $status ): void {
	$allowed_statuses = array( 'submitted', 'invalid', 'error', 'rate_limited' );
	$status           = in_array( $status, $allowed_statuses, true ) ? $status : 'error';
	$fallback         = home_url( '/contact/' );
	$referer          = wp_get_referer();
	$target           = $referer ? $referer : $fallback;

	wp_safe_redirect( add_query_arg( 'contact_status', $status, $target ) );
	exit;
}

function velour_standard_contact_length( string $value ): int {
	return function_exists( 'mb_strlen' ) ? mb_strlen( $value ) : strlen( $value );
}

function velour_standard_contact_rate_key(): string {
	$ip          = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
	$fingerprint = hash_hmac( 'sha256', $ip, wp_salt( 'auth' ) );

	return 'velour_contact_rate_' . $fingerprint;
}

function velour_standard_handle_contact(): void {
	$method = isset( $_SERVER['REQUEST_METHOD'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) : '';

	if ( 'POST' !== $method ) {
		velour_standard_contact_redirect( 'invalid' );
	}

	$nonce = isset( $_POST['velour_contact_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['velour_contact_nonce'] ) ) : '';
	if ( ! wp_verify_nonce( $nonce, 'velour_standard_contact' ) ) {
		velour_standard_contact_redirect( 'invalid' );
	}

	$honeypot = isset( $_POST['velour_website'] ) ? sanitize_text_field( wp_unslash( $_POST['velour_website'] ) ) : '';
	if ( '' !== $honeypot ) {
		velour_standard_contact_redirect( 'submitted' );
	}

	$started_at     = isset( $_POST['velour_started_at'] ) ? absint( $_POST['velour_started_at'] ) : 0;
	$timing_token   = isset( $_POST['velour_timing_token'] ) ? sanitize_text_field( wp_unslash( $_POST['velour_timing_token'] ) ) : '';
	$expected_token = wp_hash( (string) $started_at, 'nonce' );
	$form_age       = time() - $started_at;

	if ( 0 === $started_at || ! hash_equals( $expected_token, $timing_token ) || $form_age < 3 || $form_age > 2 * HOUR_IN_SECONDS ) {
		velour_standard_contact_redirect( 'invalid' );
	}

	$name         = isset( $_POST['velour_name'] ) ? sanitize_text_field( wp_unslash( $_POST['velour_name'] ) ) : '';
	$email        = isset( $_POST['velour_email'] ) ? sanitize_email( wp_unslash( $_POST['velour_email'] ) ) : '';
	$order_number = isset( $_POST['velour_order_number'] ) ? sanitize_text_field( wp_unslash( $_POST['velour_order_number'] ) ) : '';
	$subject      = isset( $_POST['velour_subject'] ) ? sanitize_text_field( wp_unslash( $_POST['velour_subject'] ) ) : '';
	$message      = isset( $_POST['velour_message'] ) ? sanitize_textarea_field( wp_unslash( $_POST['velour_message'] ) ) : '';

	$allowed_subjects = array(
		'General Enquiry',
		'Order Support',
		'Shipping Question',
		'Return Request',
		'Product Recommendation',
		'Wholesale / Partnership',
		'Other',
	);

	if ( '' === $name || ! is_email( $email ) || '' === $message || ! in_array( $subject, $allowed_subjects, true ) ) {
		velour_standard_contact_redirect( 'invalid' );
	}

	if (
		velour_standard_contact_length( $name ) > 120 ||
		velour_standard_contact_length( $email ) > 254 ||
		velour_standard_contact_length( $order_number ) > 64 ||
		velour_standard_contact_length( $subject ) > 40 ||
		velour_standard_contact_length( $message ) > 5000
	) {
		velour_standard_contact_redirect( 'invalid' );
	}

	$rate_key = velour_standard_contact_rate_key();
	$attempts = (int) get_transient( $rate_key );
	if ( $attempts >= 5 ) {
		velour_standard_contact_redirect( 'rate_limited' );
	}
	set_transient( $rate_key, $attempts + 1, 10 * MINUTE_IN_SECONDS );

	$recipient = sanitize_email( (string) get_option( 'admin_email' ) );
	if ( ! is_email( $recipient ) ) {
		velour_standard_contact_redirect( 'error' );
	}

	$mail_subject  = sprintf( '[Velour] %s', $subject );
	$reply_to_email = str_replace( array( "\r", "\n" ), '', $email );
	$headers         = array( 'Reply-To: ' . $reply_to_email );
	$body            = implode(
		"\n",
		array(
			'Name: ' . $name,
			'Email: ' . $email,
			'Order Number: ' . ( '' !== $order_number ? $order_number : 'Not supplied' ),
			'Subject: ' . $subject,
			'',
			$message,
		)
	);

	$status = wp_mail( $recipient, $mail_subject, $body, $headers ) ? 'submitted' : 'error';
	velour_standard_contact_redirect( $status );
}

add_action( 'admin_post_nopriv_velour_standard_contact', 'velour_standard_handle_contact' );
add_action( 'admin_post_velour_standard_contact', 'velour_standard_handle_contact' );
