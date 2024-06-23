package io.antmedia.enterprise.streamapp;

import jakarta.websocket.HandshakeResponse;
import jakarta.websocket.server.HandshakeRequest;
import jakarta.websocket.server.ServerEndpointConfig;

import org.apache.tomcat.websocket.server.DefaultServerEndpointConfigurator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

public class AMSEndpointConfigurator extends DefaultServerEndpointConfigurator {
	public static final String USER_AGENT = "user-agent";
	public static final String ORIGIN = "origin";

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

	}
}
