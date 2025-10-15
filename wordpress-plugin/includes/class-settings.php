<?php
/**
 * Plugin Settings Page
 *
 * @package Odyssea_Lymphea
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Settings Class
 */
class Odyssea_Settings {
    
    /**
     * Add settings page to WordPress admin
     */
    public function add_settings_page() {
        add_options_page(
            'Odyssea Lymphea Settings',
            'Odyssea Lymphea',
            'manage_options',
            'odyssea-lymphea',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('odyssea_settings_group', 'odyssea_settings', array(
            'sanitize_callback' => array($this, 'sanitize_settings')
        ));
        
        // General Information Section
        add_settings_section(
            'odyssea_general_section',
            'Informations générales du cabinet',
            array($this, 'render_general_section'),
            'odyssea-lymphea'
        );
        
        // Clinic Name
        add_settings_field(
            'clinic_name',
            'Nom du cabinet',
            array($this, 'render_text_field'),
            'odyssea-lymphea',
            'odyssea_general_section',
            array('field' => 'clinic_name', 'placeholder' => 'Odyssea Lymphea')
        );
        
        // Address
        add_settings_field(
            'address',
            'Adresse',
            array($this, 'render_text_field'),
            'odyssea-lymphea',
            'odyssea_general_section',
            array('field' => 'address', 'placeholder' => 'Rue de la station, 70 - 1410 Waterloo')
        );
        
        // Phone
        add_settings_field(
            'phone',
            'Téléphone',
            array($this, 'render_text_field'),
            'odyssea-lymphea',
            'odyssea_general_section',
            array('field' => 'phone', 'placeholder' => '+32 494 74 17 77')
        );
        
        // Email
        add_settings_field(
            'email',
            'Email',
            array($this, 'render_text_field'),
            'odyssea-lymphea',
            'odyssea_general_section',
            array('field' => 'email', 'placeholder' => 'odyssea.lymphea@gmail.com', 'type' => 'email')
        );
        
        // Hours
        add_settings_field(
            'hours',
            'Horaires',
            array($this, 'render_textarea_field'),
            'odyssea-lymphea',
            'odyssea_general_section',
            array('field' => 'hours', 'placeholder' => 'Lun-Ven: 9h-18h | Sam: 9h-13h')
        );
        
        // Social Media Section
        add_settings_section(
            'odyssea_social_section',
            'Réseaux sociaux',
            array($this, 'render_social_section'),
            'odyssea-lymphea'
        );
        
        // Facebook
        add_settings_field(
            'facebook',
            'Facebook URL',
            array($this, 'render_text_field'),
            'odyssea-lymphea',
            'odyssea_social_section',
            array('field' => 'facebook', 'placeholder' => 'https://facebook.com/...')
        );
        
        // Instagram
        add_settings_field(
            'instagram',
            'Instagram URL',
            array($this, 'render_text_field'),
            'odyssea-lymphea',
            'odyssea_social_section',
            array('field' => 'instagram', 'placeholder' => 'https://instagram.com/...')
        );
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <div class="odyssea-settings-header">
                <p>Personnalisez les informations de votre cabinet qui apparaissent sur le site.</p>
            </div>
            
            <form action="options.php" method="post">
                <?php
                settings_fields('odyssea_settings_group');
                do_settings_sections('odyssea-lymphea');
                submit_button('Enregistrer les paramètres');
                ?>
            </form>
            
            <div class="odyssea-settings-info">
                <h3>📄 Pages créées par le plugin</h3>
                <ul>
                    <?php
                    $page_ids = get_option('odyssea_page_ids', array());
                    if (!empty($page_ids)) {
                        foreach ($page_ids as $key => $page_id) {
                            $page = get_post($page_id);
                            if ($page) {
                                echo '<li><a href="' . get_edit_post_link($page_id) . '">' . esc_html($page->post_title) . '</a></li>';
                            }
                        }
                    } else {
                        echo '<li>Aucune page trouvée. Désactivez et réactivez le plugin pour créer les pages.</li>';
                    }
                    ?>
                </ul>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render general section description
     */
    public function render_general_section() {
        echo '<p>Informations de contact qui seront affichées sur votre site.</p>';
    }
    
    /**
     * Render social section description
     */
    public function render_social_section() {
        echo '<p>Liens vers vos profils de réseaux sociaux (optionnel).</p>';
    }
    
    /**
     * Render text field
     */
    public function render_text_field($args) {
        $options = get_option('odyssea_settings');
        $field = $args['field'];
        $type = isset($args['type']) ? $args['type'] : 'text';
        $value = isset($options[$field]) ? $options[$field] : '';
        $placeholder = isset($args['placeholder']) ? $args['placeholder'] : '';
        
        printf(
            '<input type="%s" name="odyssea_settings[%s]" value="%s" placeholder="%s" class="regular-text" />',
            esc_attr($type),
            esc_attr($field),
            esc_attr($value),
            esc_attr($placeholder)
        );
    }
    
    /**
     * Render textarea field
     */
    public function render_textarea_field($args) {
        $options = get_option('odyssea_settings');
        $field = $args['field'];
        $value = isset($options[$field]) ? $options[$field] : '';
        $placeholder = isset($args['placeholder']) ? $args['placeholder'] : '';
        
        printf(
            '<textarea name="odyssea_settings[%s]" rows="3" class="large-text" placeholder="%s">%s</textarea>',
            esc_attr($field),
            esc_attr($placeholder),
            esc_textarea($value)
        );
    }
    
    /**
     * Sanitize settings
     */
    public function sanitize_settings($input) {
        $sanitized = array();
        
        if (isset($input['clinic_name'])) {
            $sanitized['clinic_name'] = sanitize_text_field($input['clinic_name']);
        }
        
        if (isset($input['address'])) {
            $sanitized['address'] = sanitize_text_field($input['address']);
        }
        
        if (isset($input['phone'])) {
            $sanitized['phone'] = sanitize_text_field($input['phone']);
        }
        
        if (isset($input['email'])) {
            $sanitized['email'] = sanitize_email($input['email']);
        }
        
        if (isset($input['hours'])) {
            $sanitized['hours'] = sanitize_textarea_field($input['hours']);
        }
        
        if (isset($input['facebook'])) {
            $sanitized['facebook'] = esc_url_raw($input['facebook']);
        }
        
        if (isset($input['instagram'])) {
            $sanitized['instagram'] = esc_url_raw($input['instagram']);
        }
        
        return $sanitized;
    }
}
