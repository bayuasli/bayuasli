#  𝗦𝗯𝘆𝘂𝗫𝗗 - 𝘽𝗫𝗫
  
<div align="center">  
  
![SIBAYUXD Banner](https://raw.githubusercontent.com/bayuasli/dat1/main/uploads/ea972f-1770551587133.jpg)  
  
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)  
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)  
[![JavaScript](https://img.shields.io/badge/language-JavaScript-yellow.svg)](https://www.javascript.com/)  
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Multi--Device-25D366.svg)](https://whatsapp.com/)  
[![Maintenance](https://img.shields.io/badge/maintained-yes-green.svg)](https://github.com/bayuasli/-)  


  
<img src="https://img.shields.io/badge/Version-2.0.0-black?style=for-the-badge&logo=github" alt="Version">
<img src="https://img.shields.io/badge/MultiDevice-Enabled-green?style=for-the-badge&logo=whatsapp" alt="MultiDevice">
<img src="https://img.shields.io/badge/Status-Stable-brightgreen?style=for-the-badge&logo=vercel" alt="Status">
<img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge&logo=opensourceinitiative" alt="License">

**A high-performance, modular WhatsApp bot engineered for stability, efficiency, and seamless multi-device operation.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-black?style=flat&logo=nodedotjs)](https://nodejs.org/)
[![SQLite3](https://img.shields.io/badge/SQLite3-Enhanced-black?style=flat&logo=sqlite)](https://sqlite.org/)
[![Baileys](https://img.shields.io/badge/Baileys-Latest-black?style=flat&logo=github)](https://github.com/WhiskeySockets/Baileys)




## 🚀 **CORE ARCHITECTURE**

ascii
┌─────────────────────────────────────────────────────┐
│                    SbyuXd-BXX Core                  │
├─────────────────────────────────────────────────────┤
│  • Multi-Device Protocol Layer                     │
│  • Modular Plugin System                           │
│  • Queue & Rate Limiter Engine                     │
│  • Optimized Memory Management                     │
│  • Context-Aware Security System                   │
└─────────────────────────────────────────────────────┘

A simple, lightweight, and easily customizable WhatsApp Multi-Device bot with a focus on stability and ease of use.  
  
[Features](#features) • [Installation](#installation) • [Documentation](#plugin-documentation) • [Contributing](#contributing)  
  
</div>  
  
---  
  
## Features  
  
• clean, straight, no cringe:  
  
• Multi Device Support - Fully compatible with WhatsApp Multi-Device  
  
• Plugin Architecture - Modular plugin system for scalable development  
  
• Lightweight - Optimized for low resource usage  
  
• Stable - Designed with reliability as priority  
  
• Easy to Use - Simple setup and configuration  
  
• Powered by better-sqlite3 - Fast and efficient local database engine  
  
• Queue System - Built-in message queue for smooth task handling  
  
• Rate Limiter - Anti-spam protection with smart delay control  
  
• Hot Plugin Loader - Auto-detect and load plugins dynamically  
  
• Owner Evaluation Mode - Built-in eval & shell execution system  
  
• Context-Based Permission System - Owner, admin, group, and private level control  
  
• Memory Optimized - Periodic garbage collection for long uptime stability  
  
---  
  
## System Requirements  
  
Before getting started, ensure your system meets the following requirements:  
  
- **Node.js** version 20 or higher  
- **npm** or **yarn** package manager  
- Stable **internet connection** for authentication  
  
---  
  
## Installation  
  
Follow these steps to install and run the bot:  
  
### 1. Clone Repository  
  
```bash  
git https://github.com/bayuasli/SbyuXd-bxx  
cd SbyuXd-bxx  
```  
  
### 2. Install Dependencies  
  
```bash  
npm install  
```  
  
or using yarn:  
  
```bash  
yarn install  
```  
  
### 3. Run the Bot  
  
```bash  
npm start  
```  
  
### 4. Authentication  
  
On first run, a pairing code will appear in the terminal. Enter this code in your WhatsApp application to complete the authentication process.  
  
---  
  
## Plugin Documentation  
  
### Plugin Structure  
  
Each plugin must follow this standard structure:  
  
```javascript  
/** @type {import('#lib/types.js').Plugin} */  
export default {  
  name: "name",                           // Plugin name (required)  
  category: "category",                   // Plugin category (required)  
  command: ["command1", "command2"],      // Command list (required)  
  alias: ["cmd1", "cmd2"],                // Command aliases (optional)  
    
  // Plugin configuration (optional)  
  settings: {  
    owner: true,      // Owner-only feature  
    private: false,   // Private chat only  
    group: true,      // Group chat only  
    admin: false,     // Group admin only  
    botAdmin: true,   // Bot must be admin  
    loading: false    // Send loading message  
  },  
  
  // Main function called when command is executed (required)  
  run: async (conn, m, context) => {  
    const { Api, Func, downloadM, quoted, metadata, isOwner, isAdmin, isBotAdmin } = context;  
    // Implementation code here  
  },  
  
  // Function called on every incoming message (optional)  
  on: async (conn, m, context) => {  
    // Implementation code here  
  }  
};  
```  
  
### Context Parameters  
  
| Parameter | Description |  
|-----------|-------------|  
| `Api` | Wrapper for API-related functions (see `lib/api.js`) |  
| `Func` | Collection of utility functions (see `lib/function.js`) |  
| `downloadM` | Function to download media from messages |  
| `quoted` | Replied message object |  
| `metadata` | Group chat metadata |  
| `isOwner` | Boolean indicating if sender is owner |  
| `isAdmin` | Boolean indicating if sender is group admin |  
| `isBotAdmin` | Boolean indicating if bot is group admin |  
  
### Autocomplete (JSDoc)  
  
For autocomplete and type checking, add JSDoc above `export default`:  
  
```javascript  
/** @type {import('#lib/types.js').Plugin} */  
export default {  
  // ... plugin code  
};  
```  
  
---  
  
## Directory Structure  
  
```  
𝗦𝗶𝗯𝗮𝘆𝘂𝗫𝗱 𝗕𝗼𝘁/  
├── lib/  
│   ├── api.js              # API wrapper functions  
│   ├── color.js            # Console color utilities  
│   ├── exif.js             # EXIF metadata handler  
│   ├── function.js         # General utility functions  
│   ├── loadPlugins.js      # Plugin loader system  
│   ├── serialize.js        # Message serialization  
│   └── types.js            # TypeScript definitions  
├── plugins/  
│   ├── downloader/         # Download plugins  
│   ├── tools/              # Tool plugins  
│   └── utility/            # Utility plugins  
├── config.js               # Configuration file  
├── handler.js              # Message handler  
├── index.js                # Entry point  
└── package.json            # Package configuration  
```  
  
---  
  
## Contributing  
  
Contributions from the community are greatly appreciated. To contribute:  
  
1. **Fork** this repository  
2. **Create a branch** for your feature: `git checkout -b feat/feature-name`  
3. **Commit** your changes: `git commit -m 'Add: feature description'`  
4. **Push** to the branch: `git push origin feat/feature-name`  
5. Create a **Pull Request**  
  
For major changes, please open an issue first to discuss the changes you would like to make.  
  
---  
  
## License  
  
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.  
  
---  
  
## Contact  
  
**Maintainer:** 𝗦𝗯𝘆𝘂𝗫𝗱    
**Repository:** [https://github.com/bayuasli/SbyuXd-bxx]  
  
---  
  
## Acknowledgments  
  
Special thanks to the following contributors and projects that have helped in the development of 𝗦𝗶𝗯𝗮𝘆𝘂𝗫𝗱 𝗕𝗼𝘁:  
  
<table>  
  <tr>  
    <td align="center">  
      <a href="https://github.com/DikaArdnt">  
        <img src="https://github.com/DikaArdnt.png?size=100" width="100px;" alt="Dika Ardnt"/>  
        <br />  
        <sub><b>Dika Ardnt</b></sub>  
      </a>  
    </td>  
    <td align="center">  
      <a href="https://github.com/WhiskeySockets/Baileys">  
        <img src="https://github.com/WhiskeySockets.png?size=100" width="100px;" alt="WhiskeySockets"/>  
        <br />  
        <sub><b>Baileys Library</b></sub>  
      </a>  
    </td>  
  </tr>  
</table>  
  
### Contributors  
  
<table>  
  <tr>  
    <td align="center">  
      <a href="https://github.com/AgusXzz">  
        <img src="https://github.com/AgusXzz.png?size=100" width="100px;" alt="Agus"/>  
        <br />  
        <sub><b>bxx</b></sub>  
      </a>  
    </td>  
    <td align="center">  
      <a href="https://github.com/bayuasli">  
        <img src="https://raw.githubusercontent.com/bayuasli/dat1/main/uploads/ea972f-1770551587133.jpg" width="100px;" alt="SbyuXd"/>  
        <br />  
        <sub><b>Sibayu</b></sub>  
      </a>  
    </td>  
    <td align="center">  
      <a href="https://github.com/vryptt">  
        <img src="https://github.com/vryptt.png?size=100" width="100px;" alt="Vcepirit"/>  
        <br />  
        <sub><b>Vcepirit</b></sub>  
      </a>  
    </td>  
  </tr>  
</table>  
  
---  
  
<div align="center">  
  
**Made with ❤️ by the 𝗦𝗶𝗯𝗮𝘆𝘂𝗫𝗱 𝗕𝗼𝘁**  
  
⭐ Don't forget to give a star if this project helps you!  
  
</div>