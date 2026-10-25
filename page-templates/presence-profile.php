<?php
/**
 * Template Name: Presence Profile
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );

get_header();
?>
<main id="main" class="velour-presence-profile" data-presence-profile>
	<div class="velour-presence-progress" aria-hidden="true"><span data-presence-progress></span></div>
	<p class="screen-reader-text" data-presence-status role="status" aria-live="polite"></p>

	<article class="velour-presence-panel is-active" data-presence-step="0" tabindex="-1">
		<div class="velour-container velour-presence-intro">
			<div class="velour-presence-copy">
				<span class="velour-kicker"><?php esc_html_e( 'The Velour Presence Profile', 'velour-standard' ); ?></span>
				<h1><?php esc_html_e( 'Discover the scent that moves like you do.', 'velour-standard' ); ?></h1>
				<p><?php esc_html_e( 'A private fragrance consultation shaped by energy, environment and the impression you leave behind.', 'velour-standard' ); ?></p>
				<button class="velour-presence-start" type="button" data-presence-next><?php esc_html_e( 'Begin the profile', 'velour-standard' ); ?></button>
			</div>
			<figure class="velour-presence-image">
				<img src="<?php echo esc_url( get_theme_file_uri( '/assets/images/velour-perfume-display.png' ) ); ?>" alt="<?php esc_attr_e( 'Velour fragrance and display collection', 'velour-standard' ); ?>">
			</figure>
		</div>
	</article>

	<article class="velour-presence-panel" data-presence-step="1" tabindex="-1">
		<div class="velour-container velour-presence-question velour-presence-question--split">
			<div><span class="velour-presence-count"><?php esc_html_e( 'Identity note', 'velour-standard' ); ?></span><h2><?php esc_html_e( 'How do you identify?', 'velour-standard' ); ?></h2></div>
			<div class="velour-presence-answers">
				<button type="button" data-presence-gender="masculine"><?php esc_html_e( 'Masculine', 'velour-standard' ); ?></button>
				<button type="button" data-presence-gender="feminine"><?php esc_html_e( 'Feminine', 'velour-standard' ); ?></button>
				<button type="button" data-presence-gender="balanced"><?php esc_html_e( 'Balanced / Fluid', 'velour-standard' ); ?></button>
				<button type="button" data-presence-gender="unspecified"><?php esc_html_e( 'Prefer not to say', 'velour-standard' ); ?></button>
			</div>
		</div>
	</article>

	<article class="velour-presence-panel" data-presence-step="2" tabindex="-1">
		<div class="velour-container velour-presence-question">
			<span class="velour-presence-count"><?php esc_html_e( '01 / 04', 'velour-standard' ); ?></span>
			<h2><?php esc_html_e( 'Your ideal evening looks like:', 'velour-standard' ); ?></h2>
			<div class="velour-presence-answers">
				<button type="button" data-presence-answer data-archetype="executive"><?php esc_html_e( 'A precise dinner, a clean jacket, a room that knows your name.', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="visionary"><?php esc_html_e( 'A late conversation about the future, surrounded by quiet glow.', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="minimalist"><?php esc_html_e( 'A silent room, fresh linen, one beautiful object in view.', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="midnight"><?php esc_html_e( 'Low light, deep music, and an entrance no one forgets.', 'velour-standard' ); ?></button>
			</div>
		</div>
	</article>

	<article class="velour-presence-panel" data-presence-step="3" tabindex="-1">
		<div class="velour-container velour-presence-question velour-presence-question--split">
			<div><span class="velour-presence-count"><?php esc_html_e( '02 / 04', 'velour-standard' ); ?></span><h2><?php esc_html_e( 'Which word describes your energy?', 'velour-standard' ); ?></h2></div>
			<div class="velour-presence-answers">
				<button type="button" data-presence-answer data-archetype="executive"><?php esc_html_e( 'Disciplined', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="visionary"><?php esc_html_e( 'Magnetic', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="minimalist"><?php esc_html_e( 'Composed', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="midnight"><?php esc_html_e( 'Intense', 'velour-standard' ); ?></button>
			</div>
		</div>
	</article>

	<article class="velour-presence-panel" data-presence-step="4" tabindex="-1">
		<div class="velour-container velour-presence-question">
			<span class="velour-presence-count"><?php esc_html_e( '03 / 04', 'velour-standard' ); ?></span>
			<h2><?php esc_html_e( 'What impression do you leave behind?', 'velour-standard' ); ?></h2>
			<div class="velour-presence-answers velour-presence-answers--editorial">
				<button type="button" data-presence-answer data-archetype="executive"><?php esc_html_e( 'Authority without noise.', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="visionary"><?php esc_html_e( 'Warmth with an unexpected edge.', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="minimalist"><?php esc_html_e( 'Clarity, restraint, and immaculate taste.', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="midnight"><?php esc_html_e( 'Depth that stays in the room.', 'velour-standard' ); ?></button>
			</div>
		</div>
	</article>

	<article class="velour-presence-panel" data-presence-step="5" tabindex="-1">
		<div class="velour-container velour-presence-question velour-presence-question--split">
			<div><span class="velour-presence-count"><?php esc_html_e( '04 / 04', 'velour-standard' ); ?></span><h2><?php esc_html_e( 'What kind of environment do you thrive in?', 'velour-standard' ); ?></h2></div>
			<div class="velour-presence-answers">
				<button type="button" data-presence-answer data-archetype="executive"><?php esc_html_e( 'Structured surfaces. Everything has a place.', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="visionary"><?php esc_html_e( 'Open space, art, light and room to think.', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="minimalist"><?php esc_html_e( 'Soft neutrals, quiet materials, fewer distractions.', 'velour-standard' ); ?></button>
				<button type="button" data-presence-answer data-archetype="midnight"><?php esc_html_e( 'Dark textures, satin shadow, private atmosphere.', 'velour-standard' ); ?></button>
			</div>
		</div>
	</article>

	<article class="velour-presence-panel" data-presence-step="6" tabindex="-1">
		<div class="velour-container velour-presence-email">
			<span class="velour-kicker"><?php esc_html_e( 'Private consultation', 'velour-standard' ); ?></span>
			<h2><?php esc_html_e( 'Receive your Velour Presence Profile.', 'velour-standard' ); ?></h2>
			<p><?php esc_html_e( 'Enter your email for a saved recommendation, or continue directly to your result.', 'velour-standard' ); ?></p>
			<form class="velour-presence-email-form" data-presence-email-form>
				<label class="screen-reader-text" for="velour-presence-email"><?php esc_html_e( 'Email address', 'velour-standard' ); ?></label>
				<input id="velour-presence-email" type="email" name="email" maxlength="254" autocomplete="email" required placeholder="<?php esc_attr_e( 'Email address', 'velour-standard' ); ?>">
				<button class="velour-btn velour-btn-primary" type="submit"><?php esc_html_e( 'Reveal profile', 'velour-standard' ); ?></button>
			</form>
			<button class="velour-text-link" type="button" data-presence-skip><?php esc_html_e( 'Skip and reveal', 'velour-standard' ); ?></button>
		</div>
	</article>

	<article class="velour-presence-panel velour-presence-result-panel" data-presence-step="7" data-presence-result-panel role="region" aria-labelledby="velour-presence-result-title" tabindex="-1">
		<div class="velour-container velour-presence-result">
			<header class="velour-presence-result-hero">
				<span class="velour-kicker"><?php esc_html_e( 'You are', 'velour-standard' ); ?></span>
				<h2 id="velour-presence-result-title" data-presence-result-title><?php esc_html_e( 'The Executive', 'velour-standard' ); ?></h2>
				<p data-presence-result-line><?php esc_html_e( 'Structured. Disciplined. Unforgettable.', 'velour-standard' ); ?></p>
			</header>
			<div class="velour-presence-result-grid">
				<div><span><?php esc_html_e( 'Personality summary', 'velour-standard' ); ?></span><p data-presence-result-summary></p></div>
				<div><span><?php esc_html_e( 'Why it suits you', 'velour-standard' ); ?></span><p data-presence-result-why></p></div>
				<div><span><?php esc_html_e( 'Scent mood', 'velour-standard' ); ?></span><p data-presence-result-mood></p></div>
			</div>
			<section class="velour-presence-product-section">
				<h3><?php esc_html_e( 'Recommended fragrances', 'velour-standard' ); ?></h3>
				<div class="velour-presence-product-grid" data-presence-fragrance-products></div>
			</section>
			<section class="velour-presence-product-section">
				<h3><?php esc_html_e( 'Complete Your Ritual', 'velour-standard' ); ?></h3>
				<div class="velour-presence-product-grid" data-presence-ritual-products></div>
			</section>
			<div class="velour-presence-result-actions">
				<a class="velour-btn velour-btn-primary" href="<?php echo esc_url( $shop_url ); ?>"><?php esc_html_e( 'Shop recommended fragrances', 'velour-standard' ); ?></a>
				<button class="velour-text-link" type="button" data-presence-retake><?php esc_html_e( 'Retake profile', 'velour-standard' ); ?></button>
			</div>
		</div>
	</article>
</main>
<?php
get_footer();
