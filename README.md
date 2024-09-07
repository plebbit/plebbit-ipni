#### introduction

It is required to run `index-provider`, `storetheindex`, `indexstar` and `proxy-server`

- `index-provider` is required to PUT/announce from kubo to `index-provider`
- `storetheindex` is required to sync with `index-provider` and serve a `/cid/{cid}` endpoint (like https://cid.contact/cid/{cid})
- `indexstar` is required to translate `/cid/{cid}` into `/routing/v1/providers/{cid}` (like https://specs.ipfs.tech/routing/http-routing-v1/)
- `proxy-server` is required to forward `GET /routing/v1/providers/{cid}` to `indexstar` and `PUT /routing/v1/providers` to `index-provider` 

#### getting started with docker
```
scripts/init-config.sh
docker-compose up
```

#### getting started without docker
```
# install node.js
sudo apt install nodejs npm && sudo npm install -g n && sudo n latest
npm install

# init config
scripts/init-config.sh

# launch all required services
PROVIDER_PATH=.index-provider bin/index-provider daemon
STORETHEINDEX_PATH=.storetheindex bin/storetheindex daemon
INDEXSTAR_PATH=.indexstar bin/indexstar --listen :7777 --backends http://127.0.0.1:3000 --providersBackends http://no
node ./proxy-server.js
```
