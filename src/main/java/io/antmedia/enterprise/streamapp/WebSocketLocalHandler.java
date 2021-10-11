package io.antmedia.enterprise.streamapp;

import java.io.IOException;

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
import org.json.simple.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.web.context.ConfigurableWebApplicationContext;
import org.springframework.web.context.support.WebApplicationContextUtils;

import io.antmedia.websocket.WebSocketCommunityHandler;
import io.antmedia.websocket.WebSocketConstants;


@ServerEndpoint(value="/websocket", configurator=AMSEndpointConfigurator.class)
public class WebSocketLocalHandler {

	WebSocketCommunityHandler handler;
	private String userAgent = "N/A";

	protected static Logger logger = LoggerFactory.getLogger(WebSocketLocalHandler.class);

	@OnOpen
	public void onOpen(Session session, EndpointConfig config) {
		if(config.getUserProperties().containsKey(AMSEndpointConfigurator.USER_AGENT)) {
			userAgent = (String) config.getUserProperties().get(AMSEndpointConfigurator.USER_AGENT);
		}
		
		logger.info("Web Socket opened session:{} user-agent:{}", session.getId(), userAgent);
		
		//increase max text buffer size - Chrome 90 requires
		session.setMaxTextMessageBufferSize(8192 * 10);
	}


	@OnClose
	public void onClose(Session session) {
		if(handler != null) {
			handler.onClose(session);
		}
	}

	@OnError
	public void onError(Session session, Throwable throwable) {
		if(handler != null) {
			handler.onError(session, throwable);
		}
	}

	@OnMessage
	public void onMessage(Session session, String message) {
		if(handler == null) {
			ConfigurableWebApplicationContext ctxt = null;
			try {
				ApplicationContextFacade servletContext = (ApplicationContextFacade) FieldUtils.readField(session.getContainer(), "servletContext", true);
				ctxt = (ConfigurableWebApplicationContext) WebApplicationContextUtils.getWebApplicationContext(servletContext); 
			} catch (Exception e) {
				logger.error("Application context can not be set to WebSocket handler");
				logger.error(ExceptionUtils.getMessage(e));
			} 
			
			if(ctxt != null && ctxt.isRunning()) {
				createHandler(ctxt, session);
				handler.onMessage(session, message);
			}
			else {
				sendNotInitializedError(session);
			}
		}
		else {
			handler.onMessage(session, message);
		}
	}
	
	private void createHandler(ApplicationContext context, Session session) {
		try {

			boolean rtmpForward;
			
			try {
				rtmpForward = session.getRequestParameterMap().get("rtmpForward").get(0).contains("true");	
			} catch (Exception e) {
				rtmpForward = false;
			}

			// If user want to RTMP play, should add rtmp query in websocket URL.
			if(io.antmedia.rest.RestServiceBase.isEnterprise() && !rtmpForward) {
				Class clazz = Class.forName("io.antmedia.enterprise.webrtc.WebSocketEnterpriseHandler");
				handler = (WebSocketCommunityHandler) clazz.getConstructor(ApplicationContext.class, Session.class).newInstance(context, session);
			}
			else {
				handler = new WebSocketCommunityHandler(context, session);
			}
			
			handler.setUserAgent(userAgent);
		} catch (Exception e) {
			logger.error("WebSocket handler cannot be created");
			logger.error(ExceptionUtils.getMessage(e));
		} 
	}


	public void sendNotInitializedError(Session session) {
		JSONObject jsonResponse = new JSONObject();
		jsonResponse.put(WebSocketConstants.COMMAND, WebSocketConstants.ERROR_COMMAND);
		jsonResponse.put(WebSocketConstants.DEFINITION, WebSocketConstants.NOT_INITIALIZED_YET);
		try {
			session.getBasicRemote().sendText(jsonResponse.toJSONString());
		} catch (IOException e) {
			logger.error(ExceptionUtils.getStackTrace(e));
		}
	}
}
