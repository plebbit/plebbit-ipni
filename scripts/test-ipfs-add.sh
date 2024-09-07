# add to ipfs and provide
cid=$(date | IPFS_PATH=.ipfs bin/ipfs add --quieter --pin=false)
cid=$(date | IPFS_PATH=.ipfs bin/ipfs cid base32 $cid)
IPFS_PATH=.ipfs bin/ipfs pin add $cid

# remove from ipfs and fetch providers
IPFS_PATH=.ipfs bin/ipfs pin rm $cid
IPFS_PATH=.ipfs bin/ipfs block rm $cid
IPFS_PATH=.ipfs bin/ipfs get $cid
