const fs = require('fs');
const path = require('path');

const localEnvPath = path.join(process.cwd(), '.env');
const localEnv = `SOCKET_PORT=81
PORT=8080

`;

if (!fs.existsSync(localEnvPath)) {
  fs.writeFileSync(localEnvPath, localEnv, { encoding: 'utf8' });
}
