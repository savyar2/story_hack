import { SPGNFTContractAddress, client } from './utils/utils'
import { uploadJSONToIPFS } from './utils/uploadToIpfs'
import { createHash } from 'crypto'

// BEFORE YOU RUN THIS FUNCTION: Make sure to read the README
// which contains instructions for running this "Simple Mint and Register SPG" example.

const main = async function () {
    // 1. Set up your IP Metadata
    //
    // Docs: https://docs.story.foundation/docs/ipa-metadata-standard
    const ipMetadata = {
        title: 'Orangutan',
        description: 'This is an Orangutan',
        createdAt: Math.floor(Date.now() / 1000).toString(),
        creators: [
            {
                name: 'Savya',
                address: '0x3E4c6e6A4Ec550F873081baA1dB5feD205856482',
                contributionPercent: 100,
            },
        ],
        image: 'https://ipfs.io/ipfs/bafkreib2bj47jxznqie4dm4xwkzrqc2v5ckqe52fquulmznwyl24uzedru',
        mediaType: 'image/png',
    }

    // 2. Set up your NFT Metadata
    //
    // Docs: https://docs.opensea.io/docs/metadata-standards#metadata-structure
    const nftMetadata = {
        name: 'Orangutan NFT',
        description: 'This is an Orangutan. This NFT represents ownership of the IP Asset.',
        image: 'https://ipfs.io/ipfs/bafkreib2bj47jxznqie4dm4xwkzrqc2v5ckqe52fquulmznwyl24uzedru',/*
        media: [
            {
                name: 'Midnight Marriage',
                url: 'https://cdn1.suno.ai/dcd3076f-3aa5-400b-ba5d-87d30f27c311.mp3',
                mimeType: 'audio/mpeg',
            },
        ],
        attributes: [
            {
                key: 'Suno Artist',
                value: 'amazedneurofunk956',
            },
            {
                key: 'Artist ID',
                value: '4123743b-8ba6-4028-a965-75b79a3ad424',
            },
            {
                key: 'Source',
                value: 'Suno.com',
            },
        ],*/
    }

    // 3. Upload your IP and NFT Metadata to IPFS
    /*
    const ipIpfsHash = await uploadJSONToIPFS(ipMetadata)
    
    console.log('IP Metadata IPFS CID:', ipIpfsHash)
*/
    const ipHash = createHash('sha256').update(JSON.stringify(ipMetadata)).digest('hex')

    const nftIpfsHash = await uploadJSONToIPFS(nftMetadata)
    const nftHash = createHash('sha256').update(JSON.stringify(nftMetadata)).digest('hex')
    console.log('NFT Metadata IPFS CID:', nftIpfsHash)

    // 4. Register the NFT as an IP Asset
    //
    // Docs: https://docs.story.foundation/docs/sdk-ipasset#mintandregisterip
    const response = await client.ipAsset.mintAndRegisterIp({
        spgNftContract: SPGNFTContractAddress,
        allowDuplicates: true,
        ipMetadata: {
            ipMetadataURI: `https://ipfs.io/ipfs/bafkreib2bj47jxznqie4dm4xwkzrqc2v5ckqe52fquulmznwyl24uzedru`,
            ipMetadataHash: `0x${ipHash}`,
            nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
            nftMetadataHash: `0x${nftHash}`,
        },
        txOptions: { waitForTransaction: true },
    })
    console.log(`Root IPA created at transaction hash ${response.txHash}, IPA ID: ${response.ipId}`)
    console.log(`View on the explorer: https://aeneid.explorer.story.foundation/ipa/${response.ipId}`)
}

main()