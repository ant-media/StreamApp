package io.antmedia.enterprise.streamapp;

import javax.websocket.HandshakeResponse;
import javax.websocket.server.HandshakeRequest;
import javax.websocket.server.ServerEndpointConfig;

import org.apache.tomcat.websocket.server.DefaultServerEndpointConfigurator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class AMSEndpointConfigurator extends DefaultServerEndpointConfigurator {
	public static final String USER_AGENT = "user-agent";
	protected static Logger logger = LoggerFactory.getLogger(AMSEndpointConfigurator.class);

	@Override
	public void modifyHandshake(ServerEndpointConfig sec, HandshakeRequest request, HandshakeResponse response) {
		super.modifyHandshake(sec, request, response);
		if(request.getHeaders().containsKey(USER_AGENT)) {
			String userAgent = request.getHeaders().get(USER_AGENT).toString();
			sec.getUserProperties().put(USER_AGENT, userAgent);
		}
	}
}
