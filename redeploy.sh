#!/bin/sh

mvn clean install -DskipTests -Dgpg.skip=true
OUT=$?

if [ $OUT -ne 0 ]; then
    exit $OUT
fi

cp target/StreamApp.war ~/softwares/ant-media-server/webapps/

OUT=$?

if [ $OUT -ne 0 ]; then
    exit $OUT
fi

rm -rf ~/softwares/ant-media-server/webapps/StreamApp
cd ~/softwares/ant-media-server/
#./start-debug.sh
