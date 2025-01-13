package io.antmedia.enterprise.streamapp;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.websocket.HandshakeResponse;
import jakarta.websocket.server.HandshakeRequest;
import jakarta.websocket.server.ServerEndpointConfig;

import org.apache.catalina.connector.RequestFacade;
import org.apache.tomcat.websocket.server.DefaultServerEndpointConfigurator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;

public class AMSEndpointConfigurator extends DefaultServerEndpointConfigurator {
	public static final String USER_AGENT = "user-agent";
	public static final String ORIGIN = "origin";
	private static final Object X_REAL_IP = "x-real-ip";
	public static final String CLINT_IP = "client-ip";

	protected static Logger logger = LoggerFactory.getLogger(AMSEndpointConfigurator.class);

	@Override
	public void modifyHandshake(ServerEndpointConfig sec, HandshakeRequest request, HandshakeResponse response) {
		super.modifyHandshake(sec, request, response);
		Map<String, List<String>> requestHeaders = request.getHeaders();
		Map<String, Object> userProperties = sec.getUserProperties();

		if(requestHeaders.containsKey(USER_AGENT)) {
			String userAgent = requestHeaders.get(USER_AGENT).toString();
			userProperties.put(USER_AGENT, userAgent);
		}
		if(requestHeaders.containsKey(ORIGIN)){
			String origin = requestHeaders.get(ORIGIN).toString();
			userProperties.put(ORIGIN, origin);
		}
		
	    String clientIP = "N/A";
		if(requestHeaders.containsKey(X_REAL_IP)){
	    	clientIP  = requestHeaders.get(X_REAL_IP).toString();
		}
	    else {
	    	Field requestField;
			try {
				requestField = request.getClass().getDeclaredField("request");
				requestField.setAccessible(true);

				RequestFacade requestFacade = (RequestFacade) requestField.get(request);

		        if (requestFacade != null) {
					requestField = requestFacade.getClass().getDeclaredField("request");
					requestField.setAccessible(true);
					
					HttpServletRequest servletRequest = (HttpServletRequest) requestField.get(requestFacade);
		        	clientIP = servletRequest.getRemoteAddr();
		        }
			}
			catch (Exception e) {
				logger.warn("Client IP cannot be gathered");
			}
	        
	    }
	    
	    userProperties.put(CLINT_IP, clientIP);

	}
}
