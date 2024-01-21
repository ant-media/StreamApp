#!/bin/sh
AMS_DIR=~/softwares/ant-media-server
 

#Latest sdk is to be deployed to src/main/webapp 
npm run compile


#Deploy latest embedded player to the src/main/webapp
cd src/main/js/player/
npm run compile

#switch back to first dir
cd -

if [ $OUT -ne 0 ]; then
    exit $OUT
fi

mvn clean install -DskipTests -Dgpg.skip=true
OUT=$?

if [ $OUT -ne 0 ]; then
    exit $OUT
fi

rm $AMS_DIR/StreamApp*.war
cp target/StreamApp.war $AMS_DIR

OUT=$?

if [ $OUT -ne 0 ]; then
    exit $OUT
fi

cd $AMS_DIR
rm -r webapps/*App*
bash create_app.sh LiveApp $AMS_DIR
bash create_app.sh WebRTCAppEE $AMS_DIR
#./start-debug.sh
