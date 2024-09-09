#### introduction

It is required to run `index-provider`, `storetheindex`, `indexstar` and `proxy-server`

- `index-provider` is required to PUT/announce from kubo to `index-provider`
- `storetheindex` is required to sync with `index-provider` and serve a `/cid/{cid}` endpoint (like https://cid.contact/cid/{cid})
- `indexstar` is required to translate `/cid/{cid}` into `/routing/v1/providers/{cid}` (like https://specs.ipfs.tech/routing/http-routing-v1/)
- `proxy-server` is required to forward `GET /routing/v1/providers/{cid}` to `indexstar` and `PUT /routing/v1/providers` to `index-provider` 

#### getting started with docker
```
git clone https://github.com/plebbit/plebbit-ipni.git && cd plebbit-ipni

# init config
sudo apt install jq
scripts/init-config.sh

# close ports because we're docker in network host mode
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw --force enable

# install docker and docker-compose
sudo apt install docker.io
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

docker-compose up
```

#### getting started without docker
```
git clone https://github.com/plebbit/plebbit-ipni.git && cd plebbit-ipni

# install node.js
sudo apt install nodejs npm && sudo npm install -g n && sudo n latest
npm install

# init config
sudo apt install jq
scripts/init-config.sh

# close all ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw --force enable

# launch all required services with nohup so they keep running forever
PROVIDER_PATH=.index-provider nohup bin/index-provider daemon &
STORETHEINDEX_PATH=.storetheindex nohup bin/storetheindex daemon &
INDEXSTAR_PATH=.indexstar nohup bin/indexstar --listen :7777 --backends http://127.0.0.1:3000 --providersBackends http://no &
nohup node ./proxy-server.js &
```
