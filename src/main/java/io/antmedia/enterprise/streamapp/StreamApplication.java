package io.antmedia.enterprise.streamapp;

import java.io.File;
import java.util.List;

import org.red5.server.adapter.MultiThreadedApplicationAdapter;
import org.red5.server.api.scope.IScope;
import org.red5.server.api.stream.IBroadcastStream;
import org.red5.server.api.stream.IPlayItem;
import org.red5.server.api.stream.IStreamPublishSecurity;
import org.red5.server.api.stream.ISubscriberStream;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;

import io.antmedia.AntMediaApplicationAdapter;
import io.antmedia.AppSettings;
import io.antmedia.IApplicationAdaptorFactory;
import io.antmedia.datastore.db.DataStoreFactory;
import io.antmedia.enterprise.webrtc.WebRTCApplication;
import io.antmedia.muxer.IAntMediaStreamHandler;
import io.antmedia.muxer.MuxAdaptor;

public class StreamApplication extends MultiThreadedApplicationAdapter implements IAntMediaStreamHandler, ApplicationContextAware, IApplicationAdaptorFactory {
	
	private ApplicationContext appContx;
	private List<IStreamPublishSecurity> streamPublishSecurityList;
	private DataStoreFactory dataStoreFactory;
	private AppSettings appSettings;
	private AntMediaApplicationAdapter appAdaptor;
	
	@Override
	public boolean appStart(IScope app) {
		WebSocketLocalHandler.app = this;
		if(io.antmedia.rest.BroadcastRestService.isEnterprise()) {
			appAdaptor = new WebRTCApplication();
		}
		else {
			appAdaptor = new AntMediaApplicationAdapter();
		}
		appAdaptor.setAppSettings(getAppSettings());
		appAdaptor.setStreamPublishSecurityList(getStreamPublishSecurityList());
		
		if (getStreamPublishSecurityList() != null) {
			for (IStreamPublishSecurity streamPublishSecurity : getStreamPublishSecurityList()) {
				registerStreamPublishSecurity(streamPublishSecurity);
			}
		}
		
		appAdaptor.setDataStoreFactory(getDataStoreFactory());
		appAdaptor.appStart(app);
		
		return super.appStart(app);
	}

	@Override
	public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
		setAppContx(applicationContext);
	}
	
	@Override
	public void streamBroadcastClose(IBroadcastStream stream) {
		appAdaptor.streamBroadcastClose(stream);
		super.streamBroadcastClose(stream);
	}
	
	@Override
	public void streamPlayItemStop(ISubscriberStream stream, IPlayItem item) {
		super.streamPlayItemStop(stream, item);
		appAdaptor.streamPlayItemStop(item);
	}

	@Override
	public void streamSubscriberClose(ISubscriberStream stream) {
		super.streamSubscriberClose(stream);
		appAdaptor.streamSubscriberClose(stream);
	}

	@Override
	public void streamPublishStart(final IBroadcastStream stream) {
		appAdaptor.streamPublishStart(stream);
		super.streamPublishStart(stream);
	}

	public ApplicationContext getAppContx() {
		return appContx;
	}

	public void setAppContx(ApplicationContext appContx) {
		this.appContx = appContx;
	}

	public List<IStreamPublishSecurity> getStreamPublishSecurityList() {
		return streamPublishSecurityList;
	}

	public void setStreamPublishSecurityList(List<IStreamPublishSecurity> streamPublishSecurityList) {
		this.streamPublishSecurityList = streamPublishSecurityList;
	}

	public DataStoreFactory getDataStoreFactory() {
		return dataStoreFactory;
	}

	public void setDataStoreFactory(DataStoreFactory dataStoreFactory) {
		this.dataStoreFactory = dataStoreFactory;
	}

	public AppSettings getAppSettings() {
		return appSettings;
	}

	public void setAppSettings(AppSettings appSettings) {
		this.appSettings = appSettings;
	}

	public AntMediaApplicationAdapter getAppAdaptor() {
		return appAdaptor;
	}

	@Override
	public void muxingFinished(String id, File file, long duration, int resolution) {
		appAdaptor.muxingFinished(id, file, duration, resolution);
	}

	@Override
	public void setQualityParameters(String id, String quality, double speed, int pendingPacketSize) {
		appAdaptor.setQualityParameters(id, quality, speed, pendingPacketSize);		
	}

	@Override
	public void muxAdaptorAdded(MuxAdaptor muxAdaptor) {
		appAdaptor.muxAdaptorAdded(muxAdaptor);
	}

	@Override
	public void muxAdaptorRemoved(MuxAdaptor muxAdaptor) {
		appAdaptor.muxAdaptorRemoved(muxAdaptor);		
	}
}
