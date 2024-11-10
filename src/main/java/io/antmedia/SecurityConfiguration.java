package io.antmedia;

import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.authority.mapping.GrantedAuthoritiesMapper;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.oidc.user.OidcUserAuthority;
import org.springframework.security.oauth2.core.user.OAuth2UserAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.RegisterSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.session.HttpSessionEventPublisher;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@EnableWebSecurity
class SecurityConfiguration {

    private static final String GROUPS = "groups";
    private static final String REALM_ACCESS_CLAIM = "realm_access";
    private static final String ROLES_CLAIM = "roles";

    /*
     * Realm URL in this format for keycloak
     * "http://localhost:8080/realms/AntMedia";
     */
    private String realmUrl = null;

    /*
     * webapp name like: LiveApp, live
     */
    private String appName = null;
    private String clientId = "stream-application"; //"stream-application";
    private String role = "user";


    @Bean
    public SecurityFilterChain resourceServerFilterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
                // Allows preflight requests from browser for any paths under /appName/**
                .requestMatchers(new AntPathRequestMatcher("/**", HttpMethod.OPTIONS.name()))
                .permitAll()
                // Allow access without authentication to /appName/rest/**
                .requestMatchers(new AntPathRequestMatcher("/rest/**"))
                .permitAll()
                // Require authentication for all other paths under /appName/**
                .requestMatchers(new AntPathRequestMatcher("/" + appName + "/**"))
                .hasRole(role)
                // Permit access to the root URL
                .requestMatchers(new AntPathRequestMatcher("/"))
                .permitAll()
                // Authenticate any other request
                .anyRequest().authenticated()
        );

        //for vod upload
        http.csrf(AbstractHttpConfigurer::disable);

        // Configure the resource server to use JWT authentication
        http.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));

        // Configure OAuth2 login
        http.oauth2Login(Customizer.withDefaults());

        return http.build();
    }


    @Bean
    public GrantedAuthoritiesMapper userAuthoritiesMapperForKeycloak() {
        return authorities -> {
            Set<GrantedAuthority> mappedAuthorities = new HashSet<>();
            var authority = authorities.iterator().next();
            boolean isOidc = authority instanceof OidcUserAuthority;

            if (isOidc) {
                var oidcUserAuthority = (OidcUserAuthority) authority;
                var userInfo = oidcUserAuthority.getUserInfo();

                // Tokens can be configured to return roles under
                // Groups or REALM ACCESS hence have to check both
                if (userInfo.hasClaim(REALM_ACCESS_CLAIM)) {
                    var realmAccess = userInfo.getClaimAsMap(REALM_ACCESS_CLAIM);
                    var roles = (Collection<String>) realmAccess.get(ROLES_CLAIM);
                    mappedAuthorities.addAll(generateAuthoritiesFromClaim(roles));
                } else if (userInfo.hasClaim(GROUPS)) {
                    Collection<String> roles = userInfo.getClaim(GROUPS);
                    mappedAuthorities.addAll(generateAuthoritiesFromClaim(roles));
                }
            } else {
                var oauth2UserAuthority = (OAuth2UserAuthority) authority;
                Map<String, Object> userAttributes = oauth2UserAuthority.getAttributes();

                if (userAttributes.containsKey(REALM_ACCESS_CLAIM)) {
                    Map<String, Object> realmAccess = (Map<String, Object>) userAttributes.get(REALM_ACCESS_CLAIM);
                    Collection<String> roles = (Collection<String>) realmAccess.get(ROLES_CLAIM);
                    mappedAuthorities.addAll(generateAuthoritiesFromClaim(roles));
                }
            }
            return mappedAuthorities;
        };
    }

    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }

    @Bean
    protected SessionAuthenticationStrategy sessionAuthenticationStrategy() {
        return new RegisterSessionAuthenticationStrategy(sessionRegistry());
    }

    @Bean
    public HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }

    Collection<GrantedAuthority> generateAuthoritiesFromClaim(Collection<String> roles) {
        return roles.stream().map(role -> new SimpleGrantedAuthority("ROLE_" + role)).collect(
            Collectors.toList());
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withJwkSetUri(realmUrl + "/protocol/openid-connect/certs").build();
    }

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        return new InMemoryClientRegistrationRepository(keycloakClientRegistration());
    }

    @Bean
    public OAuth2AuthorizationRequestResolver authorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository) {
        return new DefaultOAuth2AuthorizationRequestResolver(clientRegistrationRepository, "/oauth2/authorization");
    }

    @Bean
    public OidcUserService oidcUserService() {
        return new OidcUserService();
    }

    @Bean
    public ClientRegistration keycloakClientRegistration() {
        return ClientRegistration.withRegistrationId("keycloak")
                .clientId(clientId)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                //.redirectUriTemplate("{baseUrl}/login/oauth2/code/{registrationId}")
                .scope("openid")
                .authorizationUri(realmUrl + "/protocol/openid-connect/auth")
                .tokenUri(realmUrl + "/protocol/openid-connect/token")
                .userInfoUri(realmUrl + "/protocol/openid-connect/userinfo")
                .userNameAttributeName("preferred_username")
                .jwkSetUri(realmUrl + "/protocol/openid-connect/certs")
                .clientName("Keycloak")
                .build();
    }


    public void setRealmUrl(String realmUrl) {
        this.realmUrl = realmUrl;
    }
    public void setAppName(String appName) {
        this.appName = appName;
    }
    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
    public void setRole(String role) {
        this.role = role;
    }
}