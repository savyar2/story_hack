import { client } from './utils/utils'
import { 
  LicenseTerms,
  WIP_TOKEN_ADDRESS 
} from "@story-protocol/core-sdk";
import { zeroAddress } from 'viem';
import dotenv from 'dotenv';
import { getAgentRecommendation } from './agent_discussion.js';

dotenv.config();

async function attachLicenseToIp(ipId: string) {
    // Get the agent recommendation first
    const { licensingCost, royaltiesPercent } = await getAgentRecommendation();
    
    const commercialTerms: LicenseTerms = {
        transferable: true,
        royaltyPolicy: process.env.ROYALTY_POLICY_LAP as `0x${string}`,
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
        uri: '',
    };

    const registerResponse = await client.license.registerPILTerms({ 
        ...commercialTerms,
        txOptions: { waitForTransaction: true } 
    });

    console.log(`License Terms registered with ID: ${registerResponse.licenseTermsId}`);

    const attachResponse = await client.license.attachLicenseTerms({
        licenseTermsId: registerResponse.licenseTermsId!,
        ipId: ipId as `0x${string}`,
        txOptions: { waitForTransaction: true }
    });

    if (attachResponse.success) {
        console.log(`Successfully attached License Terms to IP Asset at tx hash ${attachResponse.txHash}`);
    } else {
        console.log('License Terms were already attached to this IP Asset');
    }
}

const ipId = "0x955de02FEd88442A657A2d38523A7ae942D3D7a0";
attachLicenseToIp(ipId); 