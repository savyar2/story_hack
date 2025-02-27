import { PinataSDK } from 'pinata-web3'
import fs from 'fs'
import path from 'path'
import { Blob, File } from 'node:buffer'
import dotenv from 'dotenv'

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') })

// Verify JWT is available
if (!process.env.PINATA_JWT) {
    throw new Error('PINATA_JWT is not set in environment variables')
}

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT
})

export async function uploadJSONToIPFS(jsonMetadata: any): Promise<string> {
    const { IpfsHash } = await pinata.upload.json(jsonMetadata)
    return IpfsHash
}

// could use this to upload music (audio files) to IPFS
export async function uploadFileToIPFS(filePath: string, fileName: string, fileType: string): Promise<string> {
    // Use the filePath directly if it's absolute, otherwise join with cwd
    const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(process.cwd(), filePath);
        
    const blob = new Blob([fs.readFileSync(fullPath)])
    const file = new File([blob], fileName, { type: fileType })
    const { IpfsHash } = await pinata.upload.file(file)
    return IpfsHash
}
