const path = require('path');

const env = process.argv[process.argv.length - 1];
const main = env === 'production' ? 'dist/main.js' : 'src/main.ts';

const commonDeployConf = {
  user : 'pi',
  host : '192.168.1.41',
  repo : 'git@gitlab.com:charjac/cast-server.git',
  'pre-setup': 'sudo apt-get install git && sudo apt-get install omxplayer && sudo apt-get install figlet',
}

module.exports = {
  apps: [
    {
      name: env === 'production' ? 'cast-server' : 'cast-server-dev',
      script: path.join(process.cwd(), main),
      instances  : 1,
      watch: env === 'development',
      env: {
        NODE_ENV: 'development'
      },
      production_env: {
        NODE_ENV: 'production'
      }
    }
  ],

  deploy : {
    development : {
      ...commonDeployConf,
      ref  : 'origin/dev',
      path : '/home/pi/cast-server-dev',
      'post-deploy' : 'source ~/.zshrc && npm i && npm run stop && npm run dev'
    },
    production : {
      ...commonDeployConf,
      ref  : 'origin/dev',
      path : '/home/pi/cast-server',
      'post-deploy' : 'source ~/.zshrc && npm i && npm run stop && npm run build && npm start'
    }
  }
};
