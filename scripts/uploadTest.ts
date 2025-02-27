import { uploadJSONToIPFS, uploadFileToIPFS } from './utils/uploadToIpfs'

(async () => {
    const filePath = '/Users/savyar/Desktop/Code/story_hackathon/my-pookie.png'; // Change this to your actual file path
    const ipfsCID = await uploadFileToIPFS(filePath, 'my-pookie.png', 'image/png');
    console.log(`🎵 Your file is uploaded! IPFS CID: ${ipfsCID}`);
})();
