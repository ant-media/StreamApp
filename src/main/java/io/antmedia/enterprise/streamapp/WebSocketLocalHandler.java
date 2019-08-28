package io.antmedia.enterprise.streamapp;

import javax.websocket.EndpointConfig;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.tomcat.websocket.server.DefaultServerEndpointConfigurator;
import org.json.simple.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;

import io.antmedia.AppSettings;
import io.antmedia.StreamIdValidator;
import io.antmedia.enterprise.webrtc.WebRTCApplication;
import io.antmedia.enterprise.webrtc.WebSocketEnterpriseHandler;
import io.antmedia.webrtc.adaptor.RTMPAdaptor;
import io.antmedia.websocket.WebSocketCommunityHandler;
import io.antmedia.websocket.WebSocketConstants;


@ServerEndpoint(value="/websocket", configurator=DefaultServerEndpointConfigurator.class)
public class WebSocketLocalHandler {

	WebSocketCommunityHandler handler;
	public static StreamApplication app;

	protected static Logger logger = LoggerFactory.getLogger(WebSocketLocalHandler.class);

	@OnOpen
	public void onOpen(Session session, EndpointConfig config)
	{
		createHandler();
		handler.onOpen(session, config);
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


	private void createHandler() {
		if(io.antmedia.rest.BroadcastRestService.isEnterprise()) {
			handler = new WebSocketEnterpriseHandler();
			((WebSocketEnterpriseHandler)handler).setApplicationAdaptor((WebRTCApplication) app.getAppAdaptor());
		}
		else {
			handler = new WebSocketCommunityHandler();
		}
		handler.setAppContext(app.getAppContx());
	}
}
