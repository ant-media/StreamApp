#!/bin/sh
AMS_DIR=~/softwares/ant-media-server
 

#Latest sdk is to be deployed to src/main/webapp 
rm -rf dist
npm run compile
OUT=$?
if [ $OUT -ne 0 ]; then
    exit $OUT
fi



#Deploy latest embedded player to the src/main/webapp 
cd embedded-player
rm -rf dist
npm run compile
OUT=$?
if [ $OUT -ne 0 ]; then
    exit $OUT
fi

npm run deploy

OUT=$?
if [ $OUT -ne 0 ]; then
    exit $OUT
fi


OUT=$?

if [ $OUT -ne 0 ]; then
    exit $OUT
fi

#switch back to first dir
cd ..

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
rm -rf webapps/live
bash create_app.sh LiveApp $AMS_DIR
bash create_app.sh WebRTCAppEE $AMS_DIR
bash create_app.sh live $AMS_DIR
#./start-debug.sh
