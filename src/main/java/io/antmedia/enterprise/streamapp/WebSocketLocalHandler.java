package io.antmedia.enterprise.streamapp;

import javax.websocket.EndpointConfig;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import org.apache.catalina.core.ApplicationContextFacade;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.commons.lang3.reflect.FieldUtils;
import org.apache.tomcat.websocket.server.DefaultServerEndpointConfigurator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.context.support.WebApplicationContextUtils;

import io.antmedia.websocket.WebSocketCommunityHandler;


@ServerEndpoint(value="/websocket", configurator=DefaultServerEndpointConfigurator.class)
public class WebSocketLocalHandler {

	WebSocketCommunityHandler handler;

	protected static Logger logger = LoggerFactory.getLogger(WebSocketLocalHandler.class);

	@OnOpen
	public void onOpen(Session session, EndpointConfig config)
	{
        try {
        	ApplicationContextFacade servletContext = (ApplicationContextFacade) FieldUtils.readField(session.getContainer(), "servletContext", true);
    		WebApplicationContext ctxt = WebApplicationContextUtils.getWebApplicationContext(servletContext); 
    		
    		if(io.antmedia.rest.RestServiceBase.isEnterprise()) {
    			Class clazz = Class.forName("io.antmedia.enterprise.webrtc.WebSocketEnterpriseHandler");
				handler = (WebSocketCommunityHandler) clazz.newInstance();
    		}
    		else {
    			handler = new WebSocketCommunityHandler();
    		}
    		handler.setAppContext(ctxt);
    		
    		handler.onOpen(session, config);
    		logger.error("WebSocket opened for {}", ctxt.getApplicationName());
    		
        } catch (Exception e) {
        	logger.error("Exception in WebSocket handler open");
			logger.error(ExceptionUtils.getMessage(e));
		} 
	}


	@OnClose
	public void onClose(Session session) {
		handler.onClose(session);
	}

	@OnError
	public void onError(Session session, Throwable throwable) {
		handler.onError(session, throwable);
	}

	@OnMessage
	public void onMessage(Session session, String message) {
		handler.onMessage(session, message);
	}
}
