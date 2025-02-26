const PinataSDK = require('@pinata/sdk');
const fs = require('fs');

const pinata = new PinataSDK('88965623d10c3c98cd98', 'afc688afc3d6ed1908056b63488d6edf7f4731ef911e445b0317a464f3031dff');

async function uploadToIPFS() {
    const filePath = 'my-pookie.png'; // Ensure this file exists
    const readableStreamForFile = fs.createReadStream(filePath);

    const options = {
        pinataMetadata: {
            name: "test-file.png"
        },
        pinataOptions: {
            cidVersion: 0
        }
    };

    try {
        const response = await pinata.pinFileToIPFS(readableStreamForFile, options);
        console.log("✅ Uploaded to IPFS! CID:", response.IpfsHash);
    } catch (error) {
        console.error("❌ Error uploading file to IPFS:", error);
    }
}

uploadToIPFS();

uploadToIPFS();
