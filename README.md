# 🎵 AI-Powered Music Licensing & NFT Minting on Story Protocol  

This project leverages **AI Agents and Web3 technology** to automate **music licensing and IP registration**. It processes a **predefined MP3 file and image**, generates metadata, negotiates licensing terms via **AI agents**, and **mints an NFT representing the song's IP on Story Protocol**.

---

## 🚀 Features  

✅ **Predefined MP3 File & Image for Testing**  
✅ **AI-Generated Song Description & Metadata**  
✅ **AI Agents Negotiate Licensing & Royalties**  
✅ **NFT Minting to Represent the IP on Story Protocol**  
✅ **Smart Contract-Based Licensing & Royalty Management**  

---

## 🛠 Installation & Setup  

### 1️⃣ Clone the Repository  
```bash
git clone <your-repo-url>
cd <your-project-folder>
```
### 2️⃣ Install Dependencies
```bash
npm install
```
### 3️⃣ Set Up Environment Variables
Create a .env file in the project root and add the following:
OPENAI_API_KEY=<your_openai_api_key>
PINATA_JWT=<your_pinata_jwt>
WALLET_PRIVATE_KEY=<your_story_protocol_testnet_wallet_private_key>
ROYALTY_POLICY_LAP=<your_story_protocol_royalty_policy>

### Project Structure
```bash
/scripts
  ├── agent_discussion.ts         # AI agents negotiate licensing & royalties  
  ├── song_to_description.ts      # Transcribes and analyzes MP3  
  ├── simpleMintAndRegisterSpg.ts # Mints NFT & registers IP on Story Protocol  
  ├── attach_license.ts           # Attaches license terms to the IP asset  
/utils  
  ├── utils.ts                    # Story Protocol & wallet configuration  
  ├── uploadToIpfs.ts             # Uploads metadata to IPFS  
.env.example                      # Example environment variables  
README.md                         # Project documentation  
```
### 🎶 How It Works
Step 1: Generate Song Description
The predefined MP3 file is processed using AI to extract transcription and create description
Step 2: AI Agents Negotiate Licensing
Agent A (Music Analyst) determines a fair licensing cost & royalties based on song popularity.
Agent B (Royalties Negotiator) evaluates and proposes counter-offers.
The process repeats until an agreement is reached.
Step 3: Mint NFT Representing IP
The song's metadata is uploaded to IPFS.
An NFT is minted on Story Protocol, linking the metadata & licensing details.
Step 4: Attach Licensing Terms
The final agreed licensing cost & royalty structure is stored on-chain.
Smart contracts automate royalty payouts when the song is licensed.
🛠 Running the Project

### 1️⃣ Generate Song Description & Licensing Terms, and Mint NFT & Register IP
```bash
npm run mint-and-register-spg
```

### 🌍 Future Enhancements
🚀 Integrate SoundCloud API to upload any artist's track dynamically.
🚀 Allow user-defined MP3 & metadata uploads via frontend.
🚀 Expand licensing negotiation with dynamic AI pricing strategies.

### 📜 License
This project is open-source and follows the MIT License.

🔗 Built with AI + Web3 to revolutionize music licensing! 🚀