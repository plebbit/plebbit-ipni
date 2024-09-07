It is required to run `index-provider`, `storetheindex`, `indexstar` and `proxy-server`

- `index-provider` is required to PUT/announce from kubo to `index-provider`
- `storetheindex` is required to sync with `index-provider` and serve a `/cid/{cid}` endpoint (like https://cid.contact/cid/{cid})
- `indexstar` is required to translate `/cid/{cid}` into `/routing/v1/providers/{cid}` (like https://specs.ipfs.tech/routing/http-routing-v1/)
- `proxy-server` is required to forward `GET /routing/v1/providers/{cid}` to `indexstar` and `PUT /routing/v1/providers` to `index-provider` 

#### build and run index-provider
1. install go https://golang.org/dl/
2. 
```
cd repos/index-provider && CGO_ENABLED=0 go build -o ../../bin/index-provider ./cmd/provider; cd ../..
PROVIDER_PATH=.index-provider bin/index-provider init

# enable delegated routing to be able to http router announce from kubo
jq '.DelegatedRouting.ListenMultiaddr = "/ip4/0.0.0.0/tcp/9999"' .index-provider/config > tmp && mv tmp .index-provider/config
# publish to indexers every n cids
jq '.DelegatedRouting.ChunkSize = 1000' .index-provider/config > tmp && mv tmp .index-provider/config
# publish to indexers every n seconds, even if ChunkSize not reached
jq '.DelegatedRouting.AdFlushFrequency = "10s"' .index-provider/config > tmp && mv tmp .index-provider/config

# set indexers to publish to, via http only
jq '.DirectAnnounce.NoPubsubAnnounce = true' .index-provider/config > tmp && mv tmp .index-provider/config
jq '.DirectAnnounce.URLs = ["http://127.0.0.1:3001"]' .index-provider/config > tmp && mv tmp .index-provider/config
# set how indexers can ingest from provder, via http only
jq '.Ingest.PublisherKind = "http"' .index-provider/config > tmp && mv tmp .index-provider/config
# TODO: set allow list to only storetheindex peer id and cid.contact peer id

PROVIDER_PATH=.index-provider bin/index-provider daemon
```
NOTE: config file docs https://pkg.go.dev/github.com/ipni/index-provider/cmd/provider/internal/config

#### build and run storetheindex
1. install go https://golang.org/dl/
2. 
```
cd repos/storetheindex && CGO_ENABLED=0 go build -o ../../bin/storetheindex; cd ../..
STORETHEINDEX_PATH=.storetheindex bin/storetheindex init

# disable p2p stuff (setting to none bugs out when syncing, dont do it)
# jq '.Addresses.P2PAddr = "none"' .storetheindex/config > tmp && mv tmp .storetheindex/config
# disable p2p bootstrap and pubsub since disabling p2p doesnt work
jq '.Bootstrap.Peers = []' .storetheindex/config > tmp && mv tmp .storetheindex/config
jq '.Bootstrap.MinimumPeers = 0' .storetheindex/config > tmp && mv tmp .storetheindex/config
jq '.Ingest.PubSubTopic = ""' .storetheindex/config > tmp && mv tmp .storetheindex/config

# disable admin endpoint
jq '.Addresses.Admin = "none"' .storetheindex/config > tmp && mv tmp .storetheindex/config

STORETHEINDEX_PATH=.storetheindex bin/storetheindex daemon
```
NOTE: config file docs https://pkg.go.dev/github.com/ipni/storetheindex/config

#### build and run indexstar (needed to convert storetheindex /cid/{cid} to /routing/v1/providers/{cid})
1. install go https://golang.org/dl/
2. 
```
cd repos/indexstar && CGO_ENABLED=0 go build -o ../../bin/indexstar; cd ../..
INDEXSTAR_PATH=.indexstar bin/indexstar --listen :7777 --backends http://127.0.0.1:3000 --providersBackends http://no
```

#### run proxy-server
```
sudo apt install nodejs npm && sudo npm install -g n && sudo n latest
npm install
node ./proxy-server.js
```
