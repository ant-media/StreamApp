package io.antmedia.enterprise.streamapp;

import java.util.HashSet;
import java.util.Set;

import javax.websocket.Endpoint;
import javax.websocket.server.ServerApplicationConfig;
import javax.websocket.server.ServerEndpointConfig;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.antmedia.enterprise.webrtc.WebSocketEnterpriseHandler;

public class WebSocketConfig implements ServerApplicationConfig {

	private static Logger logger = LoggerFactory.getLogger(WebSocketConfig.class);
	
	@Override
	public Set<ServerEndpointConfig> getEndpointConfigs(Set<Class<? extends Endpoint>> endpointClasses) {
		return new HashSet<>();
	}

	@Override
	public Set<Class<?>> getAnnotatedEndpointClasses(Set<Class<?>> scanned) {
		Set<Class<?>> results = new HashSet<>();
		
		for (Class<?> clazz : scanned) {
			
			if (clazz.isAssignableFrom(WebSocketLocalHandler.class)) 
			{
				logger.info("Adding websocket endpoint {}" ,clazz.getName());
				results.add(clazz);
			}
		}
		return results;
	}

}
