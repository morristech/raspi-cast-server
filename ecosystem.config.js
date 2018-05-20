const path = require('path');
const dotenv = require('dotenv');

dotenv.load({
  path: path.join(process.cwd(), `env/local.env`),
});

const env = process.argv[process.argv.length - 1];
const main = env === 'production' ? 'dist/main.js' : 'src/main.ts';

if (!process.env.RASPI_IP) {
  throw new Error('You must specify RASPI_IP environment variable');
}

const commonDeployConf = {
  user : 'pi',
  host : process.env.RASPI_IP,
  repo : 'git@github.com:charjac/raspi-cast-server.git',
  'pre-setup': 'sudo apt-get install git && sudo apt-get install omxplayer && sudo apt-get install figlet',
}

module.exports = {
  apps: [
    {
      name: env === 'production' ? 'raspicast-server' : 'raspicast-server-dev',
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
