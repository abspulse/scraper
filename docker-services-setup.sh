docker network create -d overlay mobile

docker service create \
--name tor \
--publish 8118:8118 \
--network mobile \
petergombos/tor

docker service create \
--name mongo \
--publish 27017:27017 \
--mount type=bind,source=/home/pepe/projects/mobile/db,destination=/data/db \
--network mobile \
mongo:3.2

docker service create \
--name pulse \
--publish 3000:3000 \
--network mobile \
--env MONGO=mongo \
--env PROXY_URL=http://tor:8118 \
--env SENDGRID_API_KEY=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 \
petergombos/pulse
