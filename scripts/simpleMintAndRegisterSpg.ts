import { SPGNFTContractAddress, client } from './utils/utils'
import { uploadJSONToIPFS } from './utils/uploadToIpfs'
import { createHash } from 'crypto'
import { LicenseTerms, WIP_TOKEN_ADDRESS } from "@story-protocol/core-sdk";
import { zeroAddress } from 'viem';
import { getAgentRecommendation } from './agent_discussion';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// BEFORE YOU RUN THIS FUNCTION: Make sure to read the README
// which contains instructions for running this "Simple Mint and Register SPG" example.

const main = async function () {
    // FIRST: Complete agent negotiation
    console.log("Getting agent recommendations...");
    const { licensingCost, royaltiesPercent } = await getAgentRecommendation();
    console.log("Final agreed values:");
    console.log("Licensing Cost:", licensingCost);
    console.log("Royalties Percent:", royaltiesPercent);
    
    // THEN: Read metadata and proceed with minting
    // Define the path to the metadata file
    const metadataFilePath = path.join(__dirname, 'metadata.json');
    
    // Read metadata from the file
    let metadata;
    try {
        if (fs.existsSync(metadataFilePath)) {
            // Read the file
            metadata = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
            console.log("Using metadata from song:", metadata.title);
            
            // Clear the file by writing an empty JSON object
            fs.writeFileSync(metadataFilePath, JSON.stringify({}, null, 2));
            console.log("Metadata file cleared after reading");
        } else {
            console.log("No song metadata available. Please click the License button on a track first.");
            return;
        }
    } catch (error) {
        console.error("Error reading or clearing metadata file:", error);
        return;
    }
    
    // Now the metadata variable contains the song data including image_url
    console.log("Metadata loaded:", metadata);
    
    const ipfsCID = await uploadJSONToIPFS(metadata);
    console.log(`🎵 Your file is uploaded! IPFS CID: ${ipfsCID}`);
    

    // Then set up metadata and license terms
    /*
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
    */
    const ipMetadata = {
        title: metadata.name,
        description: `Song by ${metadata.artist} (For testing purposes only)`,
        ipType: 'Music',
        createdAt: metadata.release_date,
        attributes: [
            {
                key: 'Platform',
                value: 'Spotify',
            },
            {
                key: 'Album',
                value: metadata.album,
            },
            {
                key: 'URL',
                value: `https://ipfs.io/ipfs/${ipfsCID}`,
            },
            {
                key: 'Duration',
                value: metadata.duration_ms.toString(),
            },
            {
                key: 'Popularity',
                value: metadata.popularity.toString(),
            }
        ],
        creators: [
            {
                name: metadata.artist,
                address: '0x3E4c6e6A4Ec550F873081baA1dB5feD205856482', // Replace with dynamic wallet address
                contributionPercent: 100,
            },
        ],
    };


    // 2. Set up your NFT Metadata
    //
    // Docs: https://docs.opensea.io/docs/metadata-standards#metadata-structure
    const nftMetadata = {
        name: metadata.name,
        description: 'This NFT represents ownership of the IP Asset. (Not really because it\'s a test)',
        image: metadata.image_url,
        
        attributes: [
            {
                key: 'URL',
                value: `https://ipfs.io/ipfs/${ipfsCID}`,
            },
        ],/*
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

    // Use the negotiated values for the license terms
    const terms: LicenseTerms = {
        transferable: true,
        royaltyPolicy: "0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E",
        defaultMintingFee: BigInt(licensingCost),
        expiration: BigInt(0),
        commercialUse: true,
        commercialAttribution: true,
        commercializerChecker: zeroAddress,
        commercializerCheckerData: zeroAddress,
        commercialRevShare: royaltiesPercent,
        commercialRevCeiling: BigInt(0),
        derivativesAllowed: false,
        derivativesAttribution: false,
        derivativesApproval: false,
        derivativesReciprocal: false,
        derivativeRevCeiling: BigInt(0),
        currency: WIP_TOKEN_ADDRESS,
        uri: ''
    };

    const licensingConfig = {
        isSet: true,
        mintingFee: BigInt(licensingCost),
        licensingHook: zeroAddress,
        hookData: "0x" as `0x${string}`,
        commercialRevShare: royaltiesPercent,
        disabled: false,
        expectMinimumGroupRewardShare: 0,
        expectGroupRewardPool: zeroAddress
    };

    // 4. Register the NFT as an IP Asset
    //
    // Docs: https://docs.story.foundation/docs/sdk-ipasset#mintandregisterip
    const response = await client.ipAsset.mintAndRegisterIpAssetWithPilTerms({
        spgNftContract: SPGNFTContractAddress,
        allowDuplicates: true,
        licenseTermsData: [{ terms, licensingConfig }],
        ipMetadata: {
            ipMetadataURI: `https://ipfs.io/ipfs/${ipfsCID}`,
            ipMetadataHash: `0x${ipHash}`,
            nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
            nftMetadataHash: `0x${nftHash}`,
        },
        txOptions: { waitForTransaction: true },
    })
    console.log(`Root IPA created at transaction hash ${response.txHash}, IPA ID: ${response.ipId}`)
    console.log(`View on the explorer: https://aeneid.explorer.story.foundation/ipa/${response.ipId}`)
}

main().catch(console.error);