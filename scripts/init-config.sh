rm -fr .index-provider .storetheindex .indexstar

# bin should already be built
# cd repos/index-provider && CGO_ENABLED=0 go build -o ../../bin/index-provider ./cmd/provider; cd ../..

# init
PROVIDER_PATH=.index-provider  bin/index-provider init

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

# bin should already be built
# cd repos/storetheindex && CGO_ENABLED=0 go build -o ../../bin/storetheindex; cd ../..

# init
STORETHEINDEX_PATH=.storetheindex bin/storetheindex init

# disable p2p stuff (setting to none bugs out when syncing, dont do it)
# jq '.Addresses.P2PAddr = "none"' .storetheindex/config > tmp && mv tmp .storetheindex/config

# disable p2p bootstrap and pubsub since disabling p2p doesnt work
jq '.Bootstrap.Peers = []' .storetheindex/config > tmp && mv tmp .storetheindex/config
jq '.Bootstrap.MinimumPeers = 0' .storetheindex/config > tmp && mv tmp .storetheindex/config
jq '.Ingest.PubSubTopic = ""' .storetheindex/config > tmp && mv tmp .storetheindex/config

# disable admin endpoint
jq '.Addresses.Admin = "none"' .storetheindex/config > tmp && mv tmp .storetheindex/config
