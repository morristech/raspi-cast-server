const path = require('path');

module.exports = {
  apps: [
    {
      name: 'cast_server',
      script: path.join(process.cwd(), 'dist/main.js'),
      instances  : 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ],

  deploy : {
    production : {
      user : 'pi',
      host : '192.168.1.41',
      ref  : 'origin/dev',
      repo : 'git@gitlab.com:charjac/cast-server.git',
      path : '/home/pi/cast-server',
      'pre-setup': 'sudo apt-get install git && sudo apt-get install omxplayer && sudo apt-get install figlet',
      'post-deploy' : 'source ~/.zshrc && npm i && npm run stop && npm run build && npm start'
    }
  }
};
