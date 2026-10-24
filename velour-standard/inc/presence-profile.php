<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function velour_standard_presence_error( string $code, string $message, int $status = 400 ): WP_Error {
	return new WP_Error( $code, $message, array( 'status' => $status ) );
}

function velour_standard_presence_origin( string $url ): string {
	$parts = wp_parse_url( trim( $url ) );
	if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
		return '';
	}

	$scheme = strtolower( (string) $parts['scheme'] );
	$host   = strtolower( (string) $parts['host'] );
	$port   = isset( $parts['port'] ) ? (int) $parts['port'] : 0;
	if ( ( 'https' === $scheme && 443 === $port ) || ( 'http' === $scheme && 80 === $port ) ) {
		$port = 0;
	}

	return $scheme . '://' . $host . ( $port ? ':' . $port : '' );
}

function velour_standard_presence_permission( WP_REST_Request $request ) {
	// These are CSRF and browser-origin checks for a public route, not authorization.
	$nonce = (string) $request->get_header( 'X-WP-Nonce' );
	if ( '' !== $nonce && wp_verify_nonce( $nonce, 'wp_rest' ) ) {
		return true;
	}

	$request_origin = velour_standard_presence_origin( (string) $request->get_header( 'Origin' ) );
	$home_origin    = velour_standard_presence_origin( home_url( '/' ) );
	if ( '' !== $request_origin && '' !== $home_origin && hash_equals( $home_origin, $request_origin ) ) {
		return true;
	}

	return velour_standard_presence_error(
		'rest_forbidden_origin',
		__( 'This request could not be verified.', 'velour-standard' ),
		403
	);
}

function velour_standard_presence_body_is_bounded( WP_REST_Request $request ): bool {
	$content_length = isset( $_SERVER['CONTENT_LENGTH'] ) ? absint( $_SERVER['CONTENT_LENGTH'] ) : 0;
	if ( $content_length > 16384 ) {
		return false;
	}

	$params = $request->get_json_params();
	return is_array( $params ) && strlen( (string) wp_json_encode( $params ) ) <= 16384;
}

function velour_standard_presence_text( $value, int $maximum ) {
	if ( ! is_string( $value ) ) {
		return false;
	}

	$value = sanitize_text_field( $value );
	if ( '' === $value || strlen( $value ) > $maximum ) {
		return false;
	}

	return $value;
}

function velour_standard_sanitize_presence_payload( WP_REST_Request $request ) {
	if ( ! velour_standard_presence_body_is_bounded( $request ) ) {
		return velour_standard_presence_error( 'presence_payload_too_large', __( 'The profile request is too large.', 'velour-standard' ), 413 );
	}

	$params  = $request->get_json_params();
	$allowed = array( 'email', 'gender_preference', 'archetype', 'fragrance_family', 'quiz_answers' );
	if ( array_diff( array_keys( $params ), $allowed ) ) {
		return velour_standard_presence_error( 'presence_unknown_field', __( 'The profile request contains an unknown field.', 'velour-standard' ) );
	}

	$gender = velour_standard_presence_text( $params['gender_preference'] ?? '', 32 );
	$key    = velour_standard_presence_text( $params['archetype'] ?? '', 32 );
	$family = velour_standard_presence_text( $params['fragrance_family'] ?? '', 300 );
	if ( ! in_array( $gender, array( 'masculine', 'feminine', 'balanced', 'unspecified' ), true ) ||
		! in_array( $key, array( 'executive', 'visionary', 'minimalist', 'midnight' ), true ) ||
		false === $family ) {
		return velour_standard_presence_error( 'presence_invalid_profile', __( 'The profile request is invalid.', 'velour-standard' ) );
	}

	$answers = $params['quiz_answers'] ?? array();
	if ( ! is_array( $answers ) || count( $answers ) > 8 ) {
		return velour_standard_presence_error( 'presence_invalid_answers', __( 'The profile answers are invalid.', 'velour-standard' ) );
	}

	$clean_answers = array();
	foreach ( $answers as $answer ) {
		if ( ! is_array( $answer ) || array_diff( array_keys( $answer ), array( 'step', 'question', 'answer', 'archetype' ) ) ) {
			return velour_standard_presence_error( 'presence_invalid_answer', __( 'A profile answer is invalid.', 'velour-standard' ) );
		}
		$step          = isset( $answer['step'] ) ? absint( $answer['step'] ) : 0;
		$question      = velour_standard_presence_text( $answer['question'] ?? '', 180 );
		$answer_text   = velour_standard_presence_text( $answer['answer'] ?? '', 400 );
		$answer_profile = velour_standard_presence_text( $answer['archetype'] ?? '', 32 );
		if ( $step > 8 || false === $question || false === $answer_text ||
			! in_array( $answer_profile, array( 'executive', 'visionary', 'minimalist', 'midnight' ), true ) ) {
			return velour_standard_presence_error( 'presence_invalid_answer', __( 'A profile answer is invalid.', 'velour-standard' ) );
		}
		$clean_answers[] = array(
			'step'      => $step,
			'question'  => $question,
			'answer'    => $answer_text,
			'archetype' => $answer_profile,
		);
	}

	$payload = array(
		'gender_preference' => $gender,
		'archetype'         => $key,
		'fragrance_family'  => $family,
		'quiz_answers'      => $clean_answers,
	);
	if ( array_key_exists( 'email', $params ) ) {
		if ( ! is_string( $params['email'] ) ) {
			return velour_standard_presence_error( 'presence_invalid_email', __( 'Please provide a valid email address.', 'velour-standard' ) );
		}
		$email = sanitize_email( $params['email'] );
		if ( ! is_email( $email ) || strlen( $email ) > 254 ) {
			return velour_standard_presence_error( 'presence_invalid_email', __( 'Please provide a valid email address.', 'velour-standard' ) );
		}
		$payload['email'] = $email;
	}

	return $payload;
}

function velour_standard_presence_webhook_url(): string {
	// Configure in wp-config.php or the server environment. The repository default is deliberately empty.
	$url = defined( 'VELOUR_PRESENCE_WEBHOOK_URL' ) ? (string) VELOUR_PRESENCE_WEBHOOK_URL : (string) getenv( 'VELOUR_PRESENCE_WEBHOOK_URL' );
	$url = (string) apply_filters( 'velour_standard_presence_webhook_url', $url );
	return wp_http_validate_url( $url ) ? $url : '';
}

function velour_standard_presence_rate_key(): string {
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) && is_string( $_SERVER['REMOTE_ADDR'] )
		? $_SERVER['REMOTE_ADDR']
		: 'unknown';
	return 'velour_presence_rate_' . hash_hmac( 'sha256', $ip, wp_salt( 'auth' ) );
}

function velour_standard_presence_replay_key( array $payload ): string {
	return 'velour_presence_replay_' . hash_hmac( 'sha256', wp_json_encode( $payload ), wp_salt( 'nonce' ) );
}

function velour_standard_presence_retry_error( string $code, string $message, int $retry_after ): WP_Error {
	return new WP_Error(
		$code,
		$message,
		array(
			'status'      => 429,
			'retry_after' => $retry_after,
		)
	);
}

function velour_standard_presence_guard_submission( array $payload ) {
	$replay_key = velour_standard_presence_replay_key( $payload );
	if ( false !== get_transient( $replay_key ) ) {
		return velour_standard_presence_retry_error(
			'presence_duplicate_submission',
			__( 'This profile was recently submitted. Please wait before trying again.', 'velour-standard' ),
			2 * MINUTE_IN_SECONDS
		);
	}

	$rate_key = velour_standard_presence_rate_key();
	$attempts = (int) get_transient( $rate_key );
	if ( $attempts >= 5 ) {
		return velour_standard_presence_retry_error(
			'presence_rate_limited',
			__( 'Too many profile requests were submitted. Please try again later.', 'velour-standard' ),
			10 * MINUTE_IN_SECONDS
		);
	}

	// Values are counters/sentinels only; raw addresses, email, and answers are never stored.
	set_transient( $rate_key, $attempts + 1, 10 * MINUTE_IN_SECONDS );
	set_transient( $replay_key, 1, 2 * MINUTE_IN_SECONDS );
	return true;
}

function velour_standard_presence_response_item( $item ) {
	if ( ! is_array( $item ) || array_diff( array_keys( $item ), array( 'title', 'name', 'handle', 'reason' ) ) ) {
		return false;
	}
	if ( ! isset( $item['handle'] ) || ! is_string( $item['handle'] ) ||
		( isset( $item['reason'] ) && ! is_string( $item['reason'] ) ) ) {
		return false;
	}

	$title  = velour_standard_presence_text( $item['title'] ?? ( $item['name'] ?? '' ), 120 );
	$handle = sanitize_title( $item['handle'] );
	$reason = isset( $item['reason'] ) ? sanitize_text_field( $item['reason'] ) : '';
	if ( false === $title || '' === $handle || $handle !== $item['handle'] || strlen( $reason ) > 300 ) {
		return false;
	}

	return array( 'title' => $title, 'handle' => $handle, 'reason' => $reason );
}

function velour_standard_validate_recommendation( $payload ) {
	if ( ! is_array( $payload ) ) {
		return false;
	}

	$required = array( 'profile', 'tagline', 'personality_message', 'why_it_suits_you', 'scent_mood', 'recommended_fragrances' );
	foreach ( $required as $field ) {
		if ( ! array_key_exists( $field, $payload ) ) {
			return false;
		}
	}

	$limits = array(
		'profile'             => 120,
		'tagline'             => 180,
		'personality_message' => 600,
		'why_it_suits_you'    => 600,
		'scent_mood'          => 300,
	);
	$clean  = array();
	foreach ( $limits as $field => $maximum ) {
		$clean[ $field ] = velour_standard_presence_text( $payload[ $field ], $maximum );
		if ( false === $clean[ $field ] ) {
			return false;
		}
	}

	foreach ( array( 'recommended_fragrances', 'recommended_displays' ) as $field ) {
		$items = $payload[ $field ] ?? array();
		if ( ! is_array( $items ) || count( $items ) > 6 || ( 'recommended_fragrances' === $field && ! $items ) ) {
			return false;
		}
		$clean[ $field ] = array();
		foreach ( $items as $item ) {
			$clean_item = velour_standard_presence_response_item( $item );
			if ( false === $clean_item ) {
				return false;
			}
			$clean[ $field ][] = $clean_item;
		}
	}

	return $clean;
}

function velour_standard_presence_recommendation( WP_REST_Request $request ) {
	$payload = velour_standard_sanitize_presence_payload( $request );
	if ( is_wp_error( $payload ) ) {
		return $payload;
	}
	$submission_guard = velour_standard_presence_guard_submission( $payload );
	if ( is_wp_error( $submission_guard ) ) {
		return $submission_guard;
	}

	$url = velour_standard_presence_webhook_url();
	if ( '' === $url ) {
		return velour_standard_presence_error( 'presence_service_unavailable', __( 'The recommendation service is unavailable.', 'velour-standard' ), 503 );
	}

	$response = wp_remote_post(
		$url,
		array(
			'timeout'             => 6,
			'reject_unsafe_urls'  => true,
			'limit_response_size' => 32768,
			'headers'             => array( 'Content-Type' => 'application/json' ),
			'body'                => wp_json_encode( $payload ),
		)
	);
	if ( is_wp_error( $response ) ) {
		return velour_standard_presence_error( 'presence_service_failed', __( 'The recommendation service did not respond.', 'velour-standard' ), 502 );
	}

	$status = (int) wp_remote_retrieve_response_code( $response );
	if ( $status < 200 || $status >= 300 ) {
		return velour_standard_presence_error( 'presence_service_failed', __( 'The recommendation service returned an error.', 'velour-standard' ), 502 );
	}

	$recommendation = velour_standard_validate_recommendation( json_decode( wp_remote_retrieve_body( $response ), true ) );
	if ( false === $recommendation ) {
		return velour_standard_presence_error( 'presence_invalid_response', __( 'The recommendation service returned an invalid response.', 'velour-standard' ), 502 );
	}

	return rest_ensure_response( $recommendation );
}

function velour_standard_presence_missing_product( string $handle ): array {
	return array(
		'handle'  => $handle,
		'title'   => ucwords( str_replace( '-', ' ', $handle ) ),
		'missing' => true,
	);
}

function velour_standard_presence_product_action( WC_Product $product, bool $available ): array {
	$action_url   = esc_url_raw( $product->add_to_cart_url() );
	$action_label = sanitize_text_field( $product->add_to_cart_text() );
	$action_kind  = 'view_product';

	if ( 'simple' === $product->get_type() && $available && $product->is_purchasable() ) {
		$action_kind = 'quick_add';
	} elseif ( $product->is_type( 'variable' ) ) {
		$action_kind = 'select_options';
	} elseif ( $product->is_type( 'grouped' ) ) {
		$action_kind = 'view_products';
	} elseif ( $product->is_type( 'external' ) ) {
		$action_kind = 'buy_product';
	}

	if ( '' === $action_url ) {
		$action_url = esc_url_raw( get_permalink( $product->get_id() ) );
	}
	if ( '' === $action_label ) {
		$action_label = __( 'View product', 'velour-standard' );
	}

	return array(
		'actionKind'  => $action_kind,
		'actionLabel' => $action_label,
		'actionUrl'   => $action_url,
	);
}

function velour_standard_presence_products( WP_REST_Request $request ) {
	if ( ! velour_standard_presence_body_is_bounded( $request ) ) {
		return velour_standard_presence_error( 'presence_payload_too_large', __( 'The product request is too large.', 'velour-standard' ), 413 );
	}

	$params = $request->get_json_params();
	if ( array_diff( array_keys( $params ), array( 'handles' ) ) ) {
		return velour_standard_presence_error( 'presence_unknown_field', __( 'The product request contains an unknown field.', 'velour-standard' ) );
	}
	$handles = $params['handles'] ?? array();
	if ( ! is_array( $handles ) || count( $handles ) > 8 ) {
		return velour_standard_presence_error( 'presence_invalid_handles', __( 'The requested products are invalid.', 'velour-standard' ) );
	}

	$clean_handles = array();
	foreach ( $handles as $handle ) {
		$clean = is_string( $handle ) ? sanitize_title( $handle ) : '';
		if ( '' === $clean || $clean !== $handle || strlen( $clean ) > 120 ) {
			return velour_standard_presence_error( 'presence_invalid_handle', __( 'A requested product is invalid.', 'velour-standard' ) );
		}
		$clean_handles[] = $clean;
	}
	$handles  = array_values( array_unique( $clean_handles ) );
	$products = array();

	foreach ( $handles as $handle ) {
		if ( ! class_exists( 'WooCommerce' ) || ! function_exists( 'wc_get_product' ) ) {
			$products[] = velour_standard_presence_missing_product( $handle );
			continue;
		}
		$post = get_page_by_path( $handle, OBJECT, 'product' );
		if ( ! $post || 'publish' !== $post->post_status ) {
			$products[] = velour_standard_presence_missing_product( $handle );
			continue;
		}
		$product = wc_get_product( $post->ID );
		if ( ! $product || 'publish' !== get_post_status( $product->get_id() ) ) {
			$products[] = velour_standard_presence_missing_product( $handle );
			continue;
		}

		$image_id    = $product->get_image_id();
		$available   = $product->is_in_stock();
		$product_url = esc_url_raw( get_permalink( $product->get_id() ) );
		$action      = velour_standard_presence_product_action( $product, $available );
		$products[]  = array_merge(
			array(
				'handle'      => $product->get_slug(),
				'title'       => $product->get_name(),
				'image'       => $image_id ? esc_url_raw( (string) wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' ) ) : '',
				'priceHtml'   => wp_kses_post( $product->get_price_html() ),
				'priceText'   => wp_strip_all_tags( $product->get_price_html() ),
				'available'   => $available,
				'purchasable' => $product->is_purchasable(),
				'url'         => $product_url ? $product_url : home_url( '/shop/' ),
				'productId'   => $product->get_id(),
			),
			$action
		);
	}

	return rest_ensure_response( array( 'products' => $products ) );
}

function velour_standard_register_presence_routes(): void {
	register_rest_route(
		'velour/v1',
		'/recommendations',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'velour_standard_presence_recommendation',
			'permission_callback' => 'velour_standard_presence_permission',
		)
	);
	register_rest_route(
		'velour/v1',
		'/products',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'velour_standard_presence_products',
			'permission_callback' => 'velour_standard_presence_permission',
		)
	);
}

add_action( 'rest_api_init', 'velour_standard_register_presence_routes' );
