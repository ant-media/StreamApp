#!/bin/sh
AMS_DIR=~/softwares/ant-media-server/
mvn clean install -DskipTests -Dgpg.skip=true
OUT=$?

if [ $OUT -ne 0 ]; then
    exit $OUT
fi

cp target/StreamApp.war $AMS_DIR

OUT=$?

if [ $OUT -ne 0 ]; then
    exit $OUT
fi

rm -rf $AMS_DIR/webapps/StreamApp
cd $AMS_DIR
rm -r webapps/*App*
sh create_app.sh LiveApp $AMS_DIR
sh create_app.sh WebRTCApp $AMS_DIR
#./start-debug.sh
