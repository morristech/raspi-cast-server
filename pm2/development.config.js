const path = require('path');

module.exports = {
  apps: [
    {
      name: 'Cast_server',
      script: path.join(process.cwd(), 'src/main.ts'),
      watch: true,
      instances  : 1,
      env_production: {
        NODE_ENV: 'development'
      }
    }
  ]
};
