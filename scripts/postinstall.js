const fs = require('fs');
const path = require('path');

const localEnvPath = path.join(process.cwd(), 'env/local.env');
const localEnv = `RASPI_IP=192.168.1.41

`;

if (!fs.existsSync(localEnvPath)) {
  fs.writeFileSync(localEnvPath, localEnv, { encoding: 'utf8' });
}
