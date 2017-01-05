docker network create -d overlay tor

docker service create \
--name tor \
--publish 8118:8118 \
--network tor \
petergombos/tor

docker network create -d overlay mobile

docker service create \
--name mongo \
--publish 27017:27017 \
--mount type=bind,source=/home/pepe/projects/mobile/db,destination=/data/db \
--network mobile \
mongo:3.2
