<?php
/**
 * Plugin Name: Momchil Headless Core
 * Description: WordPress content backend for the standalone React portfolio. Editable projects and profile with a read-only public API.
 * Version: 2.0.0
 * Author: Momchil Todorov
 * Requires at least: 6.6
 * Requires PHP: 8.0
 * Text Domain: momchil-headless-core
 * License: GPL-2.0-or-later
 */

namespace Momchil\Headless;

defined( 'ABSPATH' ) || exit;

final class Portfolio {
	private const META = array( '_mt_client_url', '_mt_stack', '_mt_visual', '_mt_category_label' );
	private const VISUALS = array( 'ligre', 'walhalla', 'elfbar', 'tzn', '' );

	public static function boot() {
		add_action( 'init', array( self::class, 'register_content' ) );
		add_action( 'rest_api_init', array( self::class, 'register_routes' ) );
		add_action( 'add_meta_boxes_mt_project', array( self::class, 'add_meta_boxes' ) );
		add_action( 'save_post_mt_project', array( self::class, 'save_meta' ) );
		add_action( 'admin_menu', array( self::class, 'setup_menu' ) );
		add_action( 'admin_init', array( self::class, 'register_settings' ) );
		add_filter( 'post_type_link', array( self::class, 'frontend_project_link' ), 10, 2 );
		add_action( 'admin_post_mt_import_cv_projects', array( self::class, 'handle_import' ) );
	}

	public static function register_content() {
		register_post_type( 'mt_project', array(
			'labels' => array( 'name' => __( 'Portfolio projects', 'momchil-headless-core' ), 'singular_name' => __( 'Project', 'momchil-headless-core' ), 'add_new_item' => __( 'Add portfolio project', 'momchil-headless-core' ), 'edit_item' => __( 'Edit project', 'momchil-headless-core' ) ),
			'public' => true,
			'publicly_queryable' => false,
			'exclude_from_search' => true,
			'show_in_rest' => true,
			'rest_base' => 'portfolio-projects',
			'menu_icon' => 'dashicons-portfolio',
			'supports' => array( 'title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'page-attributes', 'custom-fields' ),
			'taxonomies' => array( 'mt_project_category' ),
			'has_archive' => false,
			'rewrite' => array( 'slug' => 'work', 'with_front' => false ),
		) );
		register_taxonomy( 'mt_project_category', 'mt_project', array(
			'labels' => array( 'name' => __( 'Project categories', 'momchil-headless-core' ), 'singular_name' => __( 'Project category', 'momchil-headless-core' ) ),
			'public' => true,
			'show_in_rest' => true,
			'hierarchical' => true,
			'rewrite' => false,
		) );
		foreach ( self::META as $key ) {
			register_post_meta( 'mt_project', $key, array(
				'type' => 'string', 'single' => true, 'show_in_rest' => true,
				'sanitize_callback' => array( self::class, 'sanitize_meta' ),
				'auth_callback' => function ( $allowed, $meta_key, $post_id ) { return current_user_can( 'edit_post', $post_id ); },
			) );
		}
	}

	public static function sanitize_meta( $value, $key = '' ) {
		if ( '_mt_client_url' === $key ) return esc_url_raw( $value, array( 'http', 'https' ) );
		if ( '_mt_visual' === $key ) return in_array( $value, self::VISUALS, true ) ? $value : '';
		return sanitize_text_field( $value );
	}


	public static function register_routes() {
		register_rest_route( 'momchil/v2', '/portfolio', array(
			'methods' => \WP_REST_Server::READABLE,
			'permission_callback' => '__return_true',
			'callback' => function () { return rest_ensure_response( self::public_portfolio() ); },
		) );
		register_rest_route( 'momchil/v2', '/projects/(?P<slug>[a-z0-9-]+)', array(
			'methods' => \WP_REST_Server::READABLE,
			'permission_callback' => '__return_true',
			'callback' => function ( $request ) {
				foreach ( self::public_projects() as $project ) {
					if ( $project['slug'] === $request['slug'] ) return rest_ensure_response( $project );
				}
				return new \WP_Error( 'project_not_found', 'Project not found.', array( 'status' => 404 ) );
			},
		) );
	}

	public static function profile_defaults() {
		return json_decode( file_get_contents( __DIR__ . '/data/profile.json' ), true );
	}

	public static function public_portfolio() {
		return array(
			'schemaVersion' => 2,
			'profile' => array_merge( self::profile_defaults(), (array) get_option( 'mt_headless_profile', array() ) ),
			'projects' => self::public_projects(),
		);
	}

	public static function public_projects() {
		$posts = get_posts( array( 'post_type' => 'mt_project', 'post_status' => 'publish', 'has_password' => false, 'numberposts' => -1, 'orderby' => array( 'menu_order' => 'ASC', 'date' => 'DESC' ) ) );
		return array_map( function ( $post ) {
			$terms = wp_get_post_terms( $post->ID, 'mt_project_category', array( 'fields' => 'slugs' ) );
			return array(
				'id' => $post->ID,
				'slug' => $post->post_name,
				'title' => wp_specialchars_decode( get_the_title( $post ), ENT_QUOTES ),
				'summary' => wp_strip_all_tags( get_the_excerpt( $post ) ),
				'path' => '/work/' . $post->post_name . '/',
				'categories' => is_wp_error( $terms ) ? array() : $terms,
				'categoryLabel' => get_post_meta( $post->ID, '_mt_category_label', true ),
				'visual' => get_post_meta( $post->ID, '_mt_visual', true ),
				'clientUrl' => esc_url_raw( get_post_meta( $post->ID, '_mt_client_url', true ), array( 'http', 'https' ) ),
				'stack' => array_values( array_filter( array_map( 'trim', explode( ',', get_post_meta( $post->ID, '_mt_stack', true ) ) ) ) ),
				'contentHTML' => wp_kses_post( apply_filters( 'the_content', $post->post_content ) ),
				'image' => get_the_post_thumbnail_url( $post, 'large' ) ?: null,
			);
		}, $posts );
	}

	public static function add_meta_boxes() {
		add_meta_box( 'mt-project-details', __( 'Project details', 'momchil-headless-core' ), array( self::class, 'render_meta_box' ), 'mt_project', 'normal', 'high' );
	}

	public static function render_meta_box( $post ) {
		wp_nonce_field( 'mt_save_project', 'mt_project_nonce' );
		$labels = array( '_mt_client_url' => 'Client website URL', '_mt_stack' => 'Technologies (comma separated)', '_mt_category_label' => 'Short category label' );
		foreach ( $labels as $key => $label ) {
			printf( '<p><label for="%1$s"><strong>%2$s</strong></label><br><input class="widefat" type="%3$s" id="%1$s" name="%1$s" value="%4$s"></p>', esc_attr( $key ), esc_html( $label ), '_mt_client_url' === $key ? 'url' : 'text', esc_attr( get_post_meta( $post->ID, $key, true ) ) );
		}
		echo '<p><label for="_mt_visual"><strong>Technical illustration</strong></label><br><select id="_mt_visual" name="_mt_visual">';
		foreach ( self::VISUALS as $visual ) {
			printf( '<option value="%1$s" %2$s>%3$s</option>', esc_attr( $visual ), selected( get_post_meta( $post->ID, '_mt_visual', true ), $visual, false ), esc_html( $visual ?: 'General project' ) );
		}
		echo '</select></p><p>Use the excerpt for the project summary, the editor for the full case study, and Project categories for the frontend filters.</p>';
	}

	public static function save_meta( $post_id ) {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
		if ( wp_is_post_revision( $post_id ) || ! current_user_can( 'edit_post', $post_id ) ) return;
		if ( empty( $_POST['mt_project_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['mt_project_nonce'] ) ), 'mt_save_project' ) ) return;
		foreach ( self::META as $key ) {
			if ( isset( $_POST[ $key ] ) && is_string( $_POST[ $key ] ) ) update_post_meta( $post_id, $key, self::sanitize_meta( wp_unslash( $_POST[ $key ] ), $key ) );
		}
	}

	public static function setup_menu() {
		add_options_page( 'Portfolio profile', 'Portfolio profile', 'manage_options', 'mt-headless-profile', array( self::class, 'render_profile_settings' ) );
		add_management_page( 'Portfolio setup', 'Portfolio setup', 'manage_options', 'mt-portfolio-setup', array( self::class, 'render_setup' ) );
	}

	public static function render_setup() {
		if ( ! current_user_can( 'manage_options' ) ) return;
		echo '<div class="wrap"><h1>Portfolio setup</h1><p>Import the four project case studies from Momchil’s supplied CV. Imported projects will be published. Existing project slugs are skipped; their content is never overwritten.</p>';
		if ( isset( $_GET['imported'] ) ) printf( '<div class="notice notice-success"><p>Imported %d projects.</p></div>', absint( $_GET['imported'] ) );
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><input type="hidden" name="action" value="mt_import_cv_projects">';
		wp_nonce_field( 'mt_import_cv_projects' );
		submit_button( 'Import CV projects' );
		echo '</form><p>After importing, edit the entries under Portfolio projects. Change the excerpt, content, metadata and categories there.</p></div>';
	}

	public static function register_settings() {
		register_setting( 'mt_headless_profile_group', 'mt_headless_profile', array( 'type' => 'array', 'sanitize_callback' => array( self::class, 'sanitize_profile' ), 'default' => self::profile_defaults() ) );
		register_setting( 'mt_headless_profile_group', 'mt_headless_frontend_url', array( 'type' => 'string', 'sanitize_callback' => function ( $value ) { return untrailingslashit( esc_url_raw( $value, array( 'http', 'https' ) ) ); }, 'default' => 'http://localhost:5173' ) );
	}

	public static function sanitize_profile( $input ) {
		$defaults = self::profile_defaults();
		$existing = array_merge( $defaults, (array) get_option( 'mt_headless_profile', array() ) );
		if ( ! is_array( $input ) ) return $existing;
		$clean = array();
		foreach ( $defaults as $key => $default ) {
			$value = $input[ $key ] ?? $existing[ $key ];
			if ( ! is_scalar( $value ) ) $value = $existing[ $key ];
			if ( in_array( $key, array( 'experienceYears', 'siteCount' ), true ) ) $clean[ $key ] = absint( $value );
			elseif ( 'email' === $key ) $clean[ $key ] = sanitize_email( $value ) ?: $existing[ $key ];
			elseif ( 'cvUrl' === $key ) {
				$value = (string) $value;
				$clean[ $key ] = str_starts_with( $value, '/' ) && ! str_starts_with( $value, '//' ) ? sanitize_text_field( $value ) : esc_url_raw( $value, array( 'http', 'https' ) );
			} else $clean[ $key ] = sanitize_textarea_field( $value );
		}
		return $clean;
	}

	public static function frontend_project_link( $url, $post ) {
		if ( 'mt_project' !== $post->post_type ) return $url;
		$frontend = get_option( 'mt_headless_frontend_url', 'http://localhost:5173' );
		return $frontend ? trailingslashit( $frontend ) . 'work/' . $post->post_name . '/' : $url;
	}

	public static function render_profile_settings() {
		if ( ! current_user_can( 'manage_options' ) ) return;
		$profile = array_merge( self::profile_defaults(), (array) get_option( 'mt_headless_profile', array() ) );
		echo '<div class="wrap"><h1>Portfolio profile</h1><p>The standalone React frontend reads these fields through the public portfolio API.</p><form method="post" action="options.php">';
		settings_fields( 'mt_headless_profile_group' );
		echo '<table class="form-table" role="presentation">';
		foreach ( $profile as $key => $value ) {
			$label = ucwords( preg_replace( '/([a-z])([A-Z])/', '$1 $2', $key ) );
			printf( '<tr><th><label for="mt-profile-%1$s">%2$s</label></th><td>', esc_attr( $key ), esc_html( $label ) );
			if ( in_array( $key, array( 'intro', 'bio', 'agencyBio', 'focusBio' ), true ) ) printf( '<textarea class="large-text" rows="3" id="mt-profile-%1$s" name="mt_headless_profile[%1$s]">%2$s</textarea>', esc_attr( $key ), esc_textarea( $value ) );
			else printf( '<input class="regular-text" id="mt-profile-%1$s" name="mt_headless_profile[%1$s]" value="%2$s">', esc_attr( $key ), esc_attr( $value ) );
			echo '</td></tr>';
		}
		printf( '<tr><th><label for="mt-frontend-url">React frontend URL</label></th><td><input class="regular-text" type="url" id="mt-frontend-url" name="mt_headless_frontend_url" value="%s"><p class="description">Used by the admin’s View project links. Include the origin, without /work/.</p></td></tr>', esc_attr( get_option( 'mt_headless_frontend_url', 'http://localhost:5173' ) ) );
		echo '</table>';
		submit_button();
		echo '</form></div>';
	}

	public static function handle_import() {
		if ( ! current_user_can( 'manage_options' ) ) wp_die( 'You do not have permission to import projects.', '', array( 'response' => 403 ) );
		check_admin_referer( 'mt_import_cv_projects' );
		$count = self::import_cv_projects();
		if ( is_wp_error( $count ) ) wp_die( esc_html( $count->get_error_message() ) );
		wp_safe_redirect( add_query_arg( array( 'page' => 'mt-portfolio-setup', 'imported' => $count ), admin_url( 'tools.php' ) ) );
		exit;
	}

	/** Called by the explicit admin action, or a local development Blueprint. */
	public static function import_cv_projects() {
		$file = __DIR__ . '/data/projects.json';
		$data = json_decode( file_get_contents( $file ), true );
		if ( ! is_array( $data ) ) return new \WP_Error( 'invalid_project_data', 'The portfolio project data could not be read.' );
		$categories = array( 'woocommerce' => 'WooCommerce', 'integrations' => 'Integrations', 'frontend' => 'Front end' );
		foreach ( $categories as $slug => $label ) {
			if ( ! term_exists( $slug, 'mt_project_category' ) ) wp_insert_term( $label, 'mt_project_category', array( 'slug' => $slug ) );
		}
		$count = 0;
		foreach ( $data as $order => $project ) {
			if ( get_page_by_path( $project['slug'], OBJECT, 'mt_project' ) ) continue;
			$content = '<!-- wp:heading --><h2 class="wp-block-heading">Project context</h2><!-- /wp:heading -->';
			$content .= '<!-- wp:paragraph --><p>' . esc_html( $project['context'] ) . '</p><!-- /wp:paragraph -->';
			$content .= '<!-- wp:heading --><h2 class="wp-block-heading">My contribution</h2><!-- /wp:heading -->';
			$content .= '<!-- wp:list --><ul class="wp-block-list">';
			foreach ( $project['contributions'] as $item ) $content .= '<!-- wp:list-item --><li>' . esc_html( $item ) . '</li><!-- /wp:list-item -->';
			$content .= '</ul><!-- /wp:list -->';
			$content .= '<!-- wp:heading --><h2 class="wp-block-heading">Delivered functionality</h2><!-- /wp:heading -->';
			$content .= '<!-- wp:paragraph --><p>' . esc_html( $project['outcome'] ) . '</p><!-- /wp:paragraph -->';
			$post_id = wp_insert_post( array( 'post_type' => 'mt_project', 'post_status' => 'publish', 'post_title' => $project['title'], 'post_name' => $project['slug'], 'post_excerpt' => $project['summary'], 'post_content' => $content, 'menu_order' => $order ), true );
			if ( is_wp_error( $post_id ) ) return $post_id;
			update_post_meta( $post_id, '_mt_client_url', esc_url_raw( $project['url'] ) );
			update_post_meta( $post_id, '_mt_stack', sanitize_text_field( implode( ', ', $project['stack'] ) ) );
			update_post_meta( $post_id, '_mt_category_label', sanitize_text_field( $project['category'] ) );
			update_post_meta( $post_id, '_mt_visual', self::sanitize_meta( $project['slug'], '_mt_visual' ) );
			wp_set_object_terms( $post_id, $project['categories'], 'mt_project_category' );
			$count++;
		}
		return $count;
	}
}

Portfolio::boot();
register_activation_hook( __FILE__, function () { Portfolio::register_content(); flush_rewrite_rules(); } );
register_deactivation_hook( __FILE__, function () { unregister_post_type( 'mt_project' ); flush_rewrite_rules(); } );
